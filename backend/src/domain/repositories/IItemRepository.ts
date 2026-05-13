/**
 * IItemRepository（出品リポジトリのインターフェース）
 *
 * UseCase層がデータアクセスに依存しないよう、「何ができるか」だけを定義する抽象。
 * 実際の処理（Prismaを使ったDB操作）は Infrastructure 層の ItemRepository が行う。
 * 依存関係逆転の原則（DIP）に従い、UseCase はこのインターフェースにのみ依存する。
 */
import { ItemEntity, CreateItemInput, GetItemsFilter, ItemStatus } from '../item';

export interface IItemRepository {
  /** 新しい出品をDBに保存する */
  create(input: CreateItemInput): Promise<ItemEntity>;

  /** フィルタ条件に合う出品一覧をDBから取得する */
  findAll(filter: GetItemsFilter): Promise<ItemEntity[]>;

  /** 指定したIDの出品1件をDBから取得する。存在しない場合は null を返す */
  findById(id: string): Promise<ItemEntity | null>;

  /** 指定したIDの出品のステータスを更新する */
  updateStatus(id: string, status: ItemStatus): Promise<ItemEntity>;
}
