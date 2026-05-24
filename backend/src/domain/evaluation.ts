/**
 * Evaluation（相互評価）に関するドメイン型定義
 */

export type EvaluationType = 'good' | 'bad' | 'cancel' | 'no_show';

export interface EvaluationEntity {
  id: string;
  transaction_id: string;
  target_user_id: string;
  reviewer_id: string | null;
  score_change: number;
  type: EvaluationType;
  created_at: Date;
  updated_at: Date;
}

/**
 * 信用スコア画面で表示する、自分が受けた評価履歴。
 * 相互評価は取引完了後のみ、ペナルティ評価は即時表示される。
 */
export interface ReceivedEvaluationEntity extends EvaluationEntity {
  item_title: string | null;
}

/**
 * 評価送信時の入力データ
 */
export interface SubmitEvaluationInput {
  transaction_id: string;
  type: 'good' | 'bad'; // 取引完了時はこの2択のみ
}

/**
 * ダブルブラインド方式における、もう一方の評価データ（スコア計算用）
 */
export interface PendingEvaluationData {
  target_user_id: string;
  score_change: number;
}
