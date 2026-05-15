/**
 * TransactionRepository（取引リポジトリの実装）
 *
 * ITransactionRepository インターフェースを実装し、Prisma Client を通じて
 * Supabase（PostgreSQL）の transactions テーブルへの実際のCRUD操作を担う。
 * この層だけがDBの具体的な実装（Prisma）に依存する。
 *
 * 原子的操作（createAtomically, updateWithItemSync）では Prisma の
 * $transaction を使い、複数テーブルの更新をDBトランザクション内で行う。
 */
import { Transaction } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ITransactionRepository } from '../../domain/repositories/ITransactionRepository';
import {
  TransactionEntity,
  TransactionStatus,
  CreateTransactionInput,
  UpdateTransactionInput,
} from '../../domain/transaction';
import { ItemStatus } from '../../domain/item';
import { ForbiddenError } from '../../domain/errors';

export class TransactionRepository implements ITransactionRepository {
  /**
   * 新しい取引をDBに作成する。
   * 初期ステータスは 'proposing'（Prismaスキーマのデフォルト値）。
   */
  async create(input: CreateTransactionInput): Promise<TransactionEntity> {
    const transaction = await prisma.transaction.create({
      data: {
        item_id: input.item_id,
        seller_id: input.seller_id,
        buyer_id: input.buyer_id,
      },
    });
    return this.toEntity(transaction);
  }

  /**
   * 取引作成 + 重複チェック + 出品ステータス更新を原子的に行う。
   * Prisma.$transaction を使い、以下を1つのDBトランザクション内で実行する：
   * 1. 同一 item_id + buyer_id の未キャンセル取引がないか確認（重複防止）
   * 2. 取引レコードを作成
   * 3. 出品ステータスを 'matching' に更新
   * 同時リクエストが来ても、DBのトランザクション分離レベルにより一方だけが成功する。
   */
  async createAtomically(input: CreateTransactionInput): Promise<TransactionEntity> {
    const result = await prisma.$transaction(async (tx) => {
      // 1. 重複チェック（DB トランザクション内で行うことで同時リクエストを防ぐ）
      const existing = await tx.transaction.findFirst({
        where: {
          item_id: input.item_id,
          buyer_id: input.buyer_id,
          status: { not: 'canceled' },
        },
      });
      if (existing) {
        throw new ForbiddenError('この出品にはすでに申し込み済みです');
      }

      // 2. 取引レコードを作成
      const transaction = await tx.transaction.create({
        data: {
          item_id: input.item_id,
          seller_id: input.seller_id,
          buyer_id: input.buyer_id,
        },
      });

      // 3. 出品ステータスを 'matching' に更新（他の購入者からの申し込みを遮断）
      await tx.item.update({
        where: { id: input.item_id },
        data: { status: 'matching' },
      });

      return transaction;
    });

    return this.toEntity(result);
  }

  /**
   * 指定した item_id に紐づく取引一覧を取得する。
   * 出品者が自分の出品に来た申し込み一覧を確認するために使う。
   */
  async findByItemId(itemId: string): Promise<TransactionEntity[]> {
    const transactions = await prisma.transaction.findMany({
      where: { item_id: itemId },
      orderBy: { created_at: 'desc' },
    });
    return transactions.map((t) => this.toEntity(t));
  }

  /**
   * 指定した userId が売り手または買い手として関わる取引一覧を取得する。
   * マイページの「取引一覧」画面で使う。
   */
  async findByUserId(userId: string): Promise<TransactionEntity[]> {
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [{ seller_id: userId }, { buyer_id: userId }],
      },
      orderBy: { created_at: 'desc' },
    });
    return transactions.map((t) => this.toEntity(t));
  }

  /**
   * 指定したIDの取引を1件取得する。
   * 存在しない場合は null を返す（存在チェックはUseCase層で行う）。
   */
  async findById(id: string): Promise<TransactionEntity | null> {
    const transaction = await prisma.transaction.findUnique({ where: { id } });
    if (!transaction) return null;
    return this.toEntity(transaction);
  }

  /**
   * 同じ item_id と buyer_id の組み合わせを持つ既存取引を検索する。
   * キャンセル済みを除く取引が存在すれば重複と判断する。
   * CreateTransactionUseCase で重複申し込みを防ぐために使う。
   */
  async findByItemAndBuyer(itemId: string, buyerId: string): Promise<TransactionEntity | null> {
    const transaction = await prisma.transaction.findFirst({
      where: {
        item_id: itemId,
        buyer_id: buyerId,
        status: { not: 'canceled' },
      },
    });
    if (!transaction) return null;
    return this.toEntity(transaction);
  }

  /**
   * 取引情報を更新する。
   * undefined のフィールドは更新対象から除外される（部分更新）。
   * meeting_datetime は ISO8601 文字列を Date 型に変換してから保存する。
   */
  async update(id: string, input: UpdateTransactionInput): Promise<TransactionEntity> {
    const transaction = await prisma.transaction.update({
      where: { id },
      data: this.buildUpdateData(input),
    });
    return this.toEntity(transaction);
  }

  /**
   * 取引ステータス更新 + 出品ステータス更新を原子的に行う。
   * Prisma.$transaction で以下を1つのDBトランザクション内で実行する：
   * 1. 取引を更新（ステータス・受け渡し情報など）
   * 2. 出品ステータスを同期（completed → completed、canceled → available）
   */
  async updateWithItemSync(
    id: string,
    input: UpdateTransactionInput,
    itemUpdate: { itemId: string; status: ItemStatus },
  ): Promise<TransactionEntity> {
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.update({
        where: { id },
        data: this.buildUpdateData(input),
      });

      await tx.item.update({
        where: { id: itemUpdate.itemId },
        data: { status: itemUpdate.status },
      });

      return transaction;
    });

    return this.toEntity(result);
  }

  /**
   * UpdateTransactionInput から Prisma の update data オブジェクトを構築するヘルパー。
   * update と updateWithItemSync で共通して使い、ロジックの重複を防ぐ。
   */
  private buildUpdateData(input: UpdateTransactionInput) {
    return {
      ...(input.status !== undefined && { status: input.status }),
      ...(input.final_price !== undefined && { final_price: input.final_price }),
      ...(input.meeting_datetime !== undefined && {
        meeting_datetime: new Date(input.meeting_datetime),
      }),
      ...(input.meeting_place !== undefined && { meeting_place: input.meeting_place }),
    };
  }

  /**
   * Prismaが返すオブジェクトをドメイン層の TransactionEntity 型に変換するプライベートメソッド。
   * 引数に Prisma 生成の Transaction 型を使うことで、フィールド変更をコンパイル時に検知できる。
   * Prismaの Enum 型は .toString() で文字列に変換する必要がある。
   */
  private toEntity(transaction: Transaction): TransactionEntity {
    return {
      ...transaction,
      status: transaction.status.toString() as TransactionStatus,
    };
  }
}
