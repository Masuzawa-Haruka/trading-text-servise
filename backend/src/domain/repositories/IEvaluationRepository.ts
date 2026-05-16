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
   * 評価を保存し、双方の評価が揃った場合は原子的に完了処理（ステータス・スコア更新）を行う。
   */
  submitEvaluationAtomically(
    transactionId: string,
    itemId: string,
    reviewerId: string,
    targetUserId: string,
    role: 'seller' | 'buyer',
    type: EvaluationType,
    scoreChange: number
  ): Promise<EvaluationEntity>;
}
