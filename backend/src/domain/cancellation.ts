/**
 * cancellation.ts
 * キャンセル・ドタキャン報告に関するドメイン定義
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

export interface RequestCancellationInput {
  transaction_id: string;
  reason?: string;
}

export interface RespondCancellationInput {
  cancellation_id: string;
  action: 'accept' | 'reject';
}

export interface ReportNoShowInput {
  transaction_id: string;
}
