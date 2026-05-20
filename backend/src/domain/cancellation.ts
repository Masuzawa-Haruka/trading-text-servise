/**
 * cancellation.ts
 * キャンセル・ドタキャン報告に関するドメイン定義
 *
 * cancellation_requests テーブルの status は当面 accepted を「実行済み」として使用する。
 * （テーブル名・status のリネームは DB が安定した後に整理予定）
 */

export type CancellationStatus = 'pending' | 'accepted' | 'rejected';

export interface CancellationRequestEntity {
  id: string;
  transaction_id: string;
  requester_id: string;
  reason: string | null;
  status: CancellationStatus;
  created_at: Date;
  updated_at: Date;
}

/** POST /api/cancellations/execute の入力 */
export interface ExecuteCancellationInput {
  transaction_id: string;
  reason?: string;
}
