/**
 * IEvaluationRepository
 */
import { EvaluationEntity, EvaluationType, ReceivedEvaluationEntity } from '../evaluation';

export interface IEvaluationRepository {
  /**
   * 取引に紐づく評価一覧を取得する
   */
  findByTransactionId(transactionId: string): Promise<EvaluationEntity[]>;

  /**
   * 信用スコア画面向けに、認証ユーザーが受け取った表示可能な評価を取得する。
   */
  findVisibleReceivedByUserId(userId: string): Promise<ReceivedEvaluationEntity[]>;

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
