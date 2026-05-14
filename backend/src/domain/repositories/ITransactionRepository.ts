/**
 * ITransactionRepository（取引リポジトリのインターフェース）
 *
 * UseCase 層がデータアクセスの実装に依存しないよう、「何ができるか」のみ定義する抽象。
 * 具体的なDB操作は Infrastructure 層の TransactionRepository が行う。
 * 依存関係逆転の原則（DIP）に従い、UseCase はこのインターフェースにのみ依存する。
 */
import {
  TransactionEntity,
  CreateTransactionInput,
  UpdateTransactionInput,
} from '../transaction';

export interface ITransactionRepository {
  /** 新しい取引（マッチング申し込み）をDBに作成する */
  create(input: CreateTransactionInput): Promise<TransactionEntity>;

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
}
