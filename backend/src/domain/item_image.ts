/**
 * ItemImage（参考書画像）に関するドメイン型定義
 *
 * 1出品につき最大5枚の画像を管理する。
 * display_order が 0 のものがメイン画像（先頭表示）。
 */

/**
 * 参考書画像エンティティ（DBの item_images テーブル1行に対応）
 */
export interface ItemImageEntity {
  id: string;
  item_id: string;
  image_url: string;
  display_order: number; // 0 が先頭（メイン画像）
  created_at: Date;
}

/**
 * 画像一括作成時の入力型（Item 作成後に呼び出す）
 */
export interface CreateItemImagesInput {
  item_id: string;
  /** アップロード済みURL。インデックス順に display_order を付与する */
  image_urls: string[];
}
