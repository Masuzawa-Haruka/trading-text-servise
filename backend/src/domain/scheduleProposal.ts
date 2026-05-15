/**
 * ScheduleProposal（日程調整候補）に関するドメイン型定義
 *
 * 1回の提案につき、最大5つの候補（日時・場所）が含まれる。
 */

export type ProposalStatus = 'pending' | 'accepted' | 'rejected';

export interface ScheduleProposalEntity {
  id: string;
  transaction_id: string;
  sender_id: string;
  proposed_datetime: Date;
  proposed_place: string;
  status: ProposalStatus;
  created_at: Date;
  updated_at: Date;
}

/**
 * 候補の1項目
 */
export interface ScheduleCandidateInput {
  proposed_datetime: string; // ISO8601 文字列
  proposed_place: string;
}

/**
 * 提案送信時の入力データ
 */
export interface SendScheduleProposalInput {
  transaction_id: string;
  sender_id: string;
  candidates: ScheduleCandidateInput[];
}

/**
 * 提案への回答入力データ
 */
export interface RespondScheduleProposalInput {
  status: 'accepted' | 'rejected';
}
