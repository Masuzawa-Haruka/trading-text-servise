/**
 * ITransactionRepository（取引リポジトリのインターフェース）
 *
 * UseCase 層がデータアクセスの実装に依存しないよう、「何ができるか」のみ定義する抽象。
 * 具体的なDB操作は Infrastructure 層の TransactionRepository が行う。
 * 依存関係逆転の原則（DIP）に従い、UseCase はこのインターフェースにのみ依存する。
 *
 * 原子的操作（Atomic）メソッド:
 * 取引と出品のステータスを同時に更新する必要がある場面では、
 * DB トランザクションで原子性を保証する専用メソッドを使う。
 * UseCase 層は「何を原子的に行うか」を指示し、Infrastructure 層が「どう原子的に行うか」を実装する。
 */
import {
  TransactionEntity,
  CreateTransactionInput,
  UpdateTransactionInput,
} from '../transaction';
import { ItemStatus } from '../item';

export interface ITransactionRepository {
  /** 新しい取引（マッチング申し込み）をDBに作成する */
  create(input: CreateTransactionInput): Promise<TransactionEntity>;

  /**
   * 取引作成 + 重複チェック + 出品ステータス更新を原子的（1つのDBトランザクション内）に行う。
   * 同時リクエストによる重複作成と、出品ステータスの不整合を防ぐ。
   */
  createAtomically(input: CreateTransactionInput): Promise<TransactionEntity>;

  /** 指定したアイテムIDに紐づく取引一覧を取得する */
  findByItemId(itemId: string): Promise<TransactionEntity[]>;

  /** ユーザー（売り手・買い手）が関わる取引一覧を取得する */
  findByUserId(userId: string): Promise<TransactionEntity[]>;

  /** 指定したIDの取引1件を取得する。存在しない場合は null を返す */
  findById(id: string): Promise<TransactionEntity | null>;

  /** 同じ出品への同じユーザーの重複申し込みを検出するために使う */
  findByItemAndBuyer(itemId: string, buyerId: string): Promise<TransactionEntity | null>;

  /** 取引情報（ステータス・価格・受け渡し情報）を更新する */
  update(id: string, input: UpdateTransactionInput): Promise<TransactionEntity>;

  /**
   * 取引ステータス更新 + 出品ステータス更新を原子的に行う。
   * 取引完了時は出品を completed に、キャンセル時は available に戻す。
   */
  updateWithItemSync(
    id: string,
    input: UpdateTransactionInput,
    itemUpdate: { itemId: string; status: ItemStatus },
  ): Promise<TransactionEntity>;
}
