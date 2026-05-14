/**
 * Transaction（マッチング取引）に関するドメイン型定義
 *
 * 「購入希望者が出品に申し込む」ところから「受け渡し完了」まで、
 * 一連の取引フローを表現するドメインの中心的なエンティティ。
 * DBや外部フレームワークには依存しない純粋な型定義ファイル。
 */

/** 取引のステータス（仕様書 5.1 の状態定義に対応） */
export type TransactionStatus = 'proposing' | 'scheduled' | 'completed' | 'canceled';

/** バリデーション用ホワイトリスト。コントローラーでキャスト前に必ず照合する */
export const VALID_TRANSACTION_STATUSES: TransactionStatus[] = [
  'proposing',
  'scheduled',
  'completed',
  'canceled',
];

/**
 * ステータス遷移のステートマシン定義。
 * キーが「現在のステータス」、値が「遷移可能なステータスの配列」。
 * UseCase 層でこの定義を参照し、不正な遷移（例: completed → proposing）を拒否する。
 *
 * 許可されるフロー：
 * proposing → scheduled（出品者が承認）
 * proposing → canceled（双方がキャンセル）
 * scheduled → completed（受け渡し完了）
 * scheduled → canceled（双方がキャンセル）
 * completed, canceled は終端状態のため遷移不可
 */
export const VALID_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  proposing: ['scheduled', 'canceled'],
  scheduled: ['completed', 'canceled'],
  completed: [],
  canceled: [],
};

/**
 * 取引エンティティ（DBの transactions テーブル 1 行に対応）
 * リポジトリ・ユースケース・コントローラー間のデータ受け渡しに使う。
 */
export interface TransactionEntity {
  id: string;
  item_id: string;
  seller_id: string;        // 出品者ユーザーID
  buyer_id: string;         // 購入希望者ユーザーID
  final_price: number | null; // 合意した価格（未確定時は null）
  status: TransactionStatus;
  meeting_datetime: Date | null; // 受け渡し日時（未確定時は null）
  meeting_place: string | null;  // 受け渡し場所（未確定時は null）
  seller_evaluated: boolean;     // 出品者が評価済みか
  buyer_evaluated: boolean;      // 購入希望者が評価済みか
  created_at: Date;
  updated_at: Date;
}

/**
 * 取引開始（申し込み）時に必要な入力データ
 * buyer_id は認証情報から自動セットするため、クライアントからは受け取らない。
 */
export interface CreateTransactionInput {
  item_id: string;
  seller_id: string;  // 出品情報から取得
  buyer_id: string;   // 認証ユーザーから自動セット
}

/**
 * 取引ステータス更新時に必要な入力データ
 * 将来的に final_price や meeting 情報もここで更新できるよう拡張可能にしている。
 */
export interface UpdateTransactionInput {
  status?: TransactionStatus;
  final_price?: number;
  meeting_datetime?: string; // ISO8601 文字列で受け取り、Date に変換する
  meeting_place?: string;
}
