/**
 * TransactionRepository（取引リポジトリの実装）
 *
 * ITransactionRepository インターフェースを実装し、Prisma Client を通じて
 * Supabase（PostgreSQL）の transactions テーブルへの実際のCRUD操作を担う。
 * この層だけがDBの具体的な実装（Prisma）に依存する。
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
   * 取引情報を更新する。
   * undefined のフィールドは更新対象から除外される（部分更新）。
   * meeting_datetime は ISO8601 文字列を Date 型に変換してから保存する。
   */
  async update(id: string, input: UpdateTransactionInput): Promise<TransactionEntity> {
    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        ...(input.status !== undefined && { status: input.status }),
        ...(input.final_price !== undefined && { final_price: input.final_price }),
        ...(input.meeting_datetime !== undefined && {
          meeting_datetime: new Date(input.meeting_datetime),
        }),
        ...(input.meeting_place !== undefined && { meeting_place: input.meeting_place }),
      },
    });
    return this.toEntity(transaction);
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
