/**
 * 出品（Item）に関するドメイン型定義
 *
 * このファイルはデータベースや外部フレームワークに依存しない、
 * アプリケーションの「出品」という概念をTypeScriptの型として表現する。
 */

/** 出品のステータス。仕様書 5.1 の状態定義に対応する */
export type ItemStatus = 'available' | 'matching' | 'completed' | 'canceled';

/** 参考書の状態（コンディション）*/
export type ItemCondition = 'new' | 'used_good' | 'used_bad';

/**
 * 出品エンティティ（DBのitemsテーブル1行に対応するデータ構造）
 * リポジトリ・ユースケース・コントローラー間でデータのやり取りに使う。
 */
export interface ItemEntity {
  id: string;
  seller_id: string;          // 出品者のユーザーID
  title: string;              // 参考書のタイトル
  description: string | null; // 詳細説明（任意）
  condition: ItemCondition;   // コンディション
  category: string | null;    // 科目カテゴリ（任意・検索用）
  price: number;              // 価格（0円推奨）
  image_url: string | null;   // 表紙画像のURL（フロントエンドからアップロード済みURLを受け取る）
  status: ItemStatus;         // 出品のステータス
  created_at: Date;
  updated_at: Date;
}

/**
 * 出品作成時に受け取る入力データの型
 * seller_id は認証情報から自動設定するため、リクエストボディには含まれない。
 */
export interface CreateItemInput {
  seller_id: string;
  title: string;
  description?: string;
  condition: ItemCondition;
  category?: string;
  price?: number;
  image_url?: string;
}

/**
 * 出品一覧取得時のフィルタ条件の型
 * クエリパラメータ（?category=xxx&condition=xxx）として受け取る。
 */
export interface GetItemsFilter {
  category?: string;
  condition?: ItemCondition;
  status?: ItemStatus;
}
