/**
 * 出品（Item）に関するドメイン型定義
 *
 * このファイルはデータベースや外部フレームワークに依存しない、
 * アプリケーションの「出品」という概念をTypeScriptの型として表現する。
 */
import { ItemImageEntity } from './item_image';
export { ItemImageEntity };

/** 出品のステータス。仕様書 5.1 の状態定義に対応する */
export type ItemStatus = 'available' | 'matching' | 'completed' | 'canceled';

/** コントローラーでのバリデーション（ホワイトリスト検証）に使う */
export const VALID_ITEM_STATUSES: ItemStatus[] = ['available', 'matching', 'completed', 'canceled'];

/** 参考書の状態（コンディション）*/
export type ItemCondition = 'new' | 'used_good' | 'used_bad';

/** コントローラーでのバリデーション（ホワイトリスト検証）に使う */
export const VALID_ITEM_CONDITIONS: ItemCondition[] = ['new', 'used_good', 'used_bad'];

/** 出品時に指定できる大阪大学キャンパス */
export type Campus = 'toyonaka' | 'suita' | 'minoh';

/** コントローラーでのバリデーション（ホワイトリスト検証）に使う */
export const VALID_CAMPUSES: Campus[] = ['toyonaka', 'suita', 'minoh'];

/**
 * 出品エンティティ（DBのitemsテーブル1行に対応するデータ構造）
 * リポジトリ・ユースケース・コントローラー間でデータのやり取りに使う。
 */
export interface ItemEntity {
  id: string;
  seller_id: string;          // 出品者のユーザーID
  title: string;              // 参考書のタイトル
  author: string | null;      // 著者名（任意）
  description: string | null; // 詳細説明（任意）
  condition: ItemCondition;   // コンディション
  campus: Campus;             // 受け渡し候補キャンパス
  handoff_location: string | null; // 受け渡し候補場所
  category: string | null;    // 科目カテゴリ（任意・検索用）
  price: number;              // 価格（0円推奨）
  status: ItemStatus;         // 出品のステータス
  images: ItemImageEntity[];  // 画像一覧（display_order 順）
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
  author?: string;
  description?: string;
  condition: ItemCondition;
  campus: Campus;
  handoff_location?: string;
  category?: string;
  price?: number;
  /** Supabase Storageへのアップロード済みURL。先頭がメイン画像（display_order=0）。最大5枚。 */
  image_urls?: string[];
}

/**
 * 出品一覧取得時のフィルタ条件の型
 * クエリパラメータ（?category=xxx&condition=xxx）として受け取る。
 */
export interface GetItemsFilter {
  q?: string;
  campus?: Campus;
  category?: string;
  condition?: ItemCondition;
  status?: ItemStatus;
}
