/**
 * IItemRepository（出品リポジトリのインターフェース）
 *
 * UseCase層がデータアクセスに依存しないよう、「何ができるか」だけを定義する抽象。
 * 実際の処理（Prismaを使ったDB操作）は Infrastructure 層の ItemRepository が行う。
 * 依存関係逆転の原則（DIP）に従い、UseCase はこのインターフェースにのみ依存する。
 */
import { ItemEntity, CreateItemInput, GetItemsFilter, ItemStatus } from '../item';
import { ItemImageEntity, CreateItemImagesInput } from '../item_image';

export interface IItemRepository {
  /** 新しい出品をDBに保存する */
  create(input: CreateItemInput): Promise<ItemEntity>;

  /** フィルタ条件に合う出品一覧をDBから取得する（画像含む） */
  findAll(filter: GetItemsFilter): Promise<ItemEntity[]>;

  /** 指定したIDの出品1件をDBから取得する（画像含む）。存在しない場合は null を返す */
  findById(id: string): Promise<ItemEntity | null>;

  /** 指定したIDの出品のステータスを更新する */
  updateStatus(id: string, status: ItemStatus): Promise<ItemEntity>;

  /** 出品に紐づく画像を一括作成する（display_order は配列インデックスに対応）*/
  createImages(input: CreateItemImagesInput): Promise<ItemImageEntity[]>;

  /** 指定した出品IDに紐づく画像を display_order 昇順で取得する */
  findImagesByItemId(item_id: string): Promise<ItemImageEntity[]>;
}

