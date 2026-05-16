/**
 * IEvaluationRepository
 */
import { EvaluationEntity, PendingEvaluationData, EvaluationType } from '../evaluation';

export interface IEvaluationRepository {
  /**
   * 取引に紐づく評価一覧を取得する
   */
  findByTransactionId(transactionId: string): Promise<EvaluationEntity[]>;

  /**
   * 1人目の評価を保存する。
   * 取引の評価フラグ（seller_evaluated / buyer_evaluated）を更新する。
   * （この時点ではステータスや信用スコアは更新しない）
   */
  submitFirstEvaluationAtomically(
    transactionId: string,
    reviewerId: string,
    targetUserId: string,
    role: 'seller' | 'buyer',
    type: EvaluationType,
    scoreChange: number
  ): Promise<EvaluationEntity>;

  /**
   * 2人目の評価を保存し、同時に取引・アイテムの完了処理、双方の信用スコア更新を原子的に行う。
   */
  submitSecondEvaluationAtomically(
    transactionId: string,
    itemId: string,
    reviewerId: string,
    targetUserId: string,
    role: 'seller' | 'buyer',
    type: EvaluationType,
    scoreChange: number,
    counterpartEvaluation: PendingEvaluationData
  ): Promise<EvaluationEntity>;
}
