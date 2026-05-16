/**
 * SubmitEvaluationUseCase
 *
 * 相互評価を送信する。
 * ダブルブラインド方式を採用し、2人目の評価完了時にまとめてスコア・ステータスを更新する。
 */
import { IEvaluationRepository } from '../domain/repositories/IEvaluationRepository';
import { ITransactionRepository } from '../domain/repositories/ITransactionRepository';
import { EvaluationEntity, SubmitEvaluationInput, PendingEvaluationData } from '../domain/evaluation';
import { NotFoundError, ForbiddenError, ValidationError } from '../domain/errors';

export class SubmitEvaluationUseCase {
  constructor(
    private readonly evaluationRepository: IEvaluationRepository,
    private readonly transactionRepository: ITransactionRepository
  ) {}

  async execute(input: SubmitEvaluationInput, requesterId: string): Promise<EvaluationEntity> {
    const { transaction_id, type } = input;

    if (type !== 'good' && type !== 'bad') {
      throw new ValidationError('取引完了時の評価は good または bad のみです');
    }

    const transaction = await this.transactionRepository.findById(transaction_id);
    if (!transaction) {
      throw new NotFoundError('取引が見つかりません');
    }

    const isEvaluationAllowedStatus =
      transaction.status === 'scheduled' || transaction.status === 'completed';
    if (!isEvaluationAllowedStatus) {
      throw new ForbiddenError('評価は日時確定後または完了済みの未評価取引でのみ行えます');
    }

    // ロール判定
    let role: 'seller' | 'buyer';
    let targetUserId: string;
    let hasEvaluated: boolean;
    let counterpartHasEvaluated: boolean;

    if (transaction.seller_id === requesterId) {
      role = 'seller';
      targetUserId = transaction.buyer_id;
      hasEvaluated = transaction.seller_evaluated;
      counterpartHasEvaluated = transaction.buyer_evaluated;
    } else if (transaction.buyer_id === requesterId) {
      role = 'buyer';
      targetUserId = transaction.seller_id;
      hasEvaluated = transaction.buyer_evaluated;
      counterpartHasEvaluated = transaction.seller_evaluated;
    } else {
      throw new ForbiddenError('この取引の評価を行う権限がありません');
    }

    if (hasEvaluated) {
      throw new ValidationError('既にこの取引の評価を完了しています');
    }

    const scoreChange = type === 'good' ? 10 : -10;

    const isLastEvaluator = counterpartHasEvaluated;

    try {
      if (isLastEvaluator) {
        // 相手が既に評価済みなので、完了処理を行う
        // 相手の評価を取得する
        const allEvaluations = await this.evaluationRepository.findByTransactionId(transaction_id);
        const counterpartEvalEntity = allEvaluations.find(e => e.reviewer_id === targetUserId);
        
        if (!counterpartEvalEntity) {
          // データ不整合
          throw new Error('相手の評価データが見つかりません');
        }
        
        if (counterpartEvalEntity.target_user_id !== requesterId) {
          throw new Error('相手の評価データの対象ユーザーが不正です');
        }

        const counterpartEvaluation: PendingEvaluationData = {
          target_user_id: counterpartEvalEntity.target_user_id,
          score_change: counterpartEvalEntity.score_change,
        };

        return await this.evaluationRepository.submitSecondEvaluationAtomically(
          transaction_id,
          transaction.item_id,
          requesterId,
          targetUserId,
          role,
          type,
          scoreChange,
          counterpartEvaluation
        );
      } else {
        // 自分が1人目の評価者
        return await this.evaluationRepository.submitFirstEvaluationAtomically(
          transaction_id,
          requesterId,
          targetUserId,
          role,
          type,
          scoreChange
        );
      }
    } catch (error: any) {
      if (error.message === 'INVALID_TRANSITION') {
        throw new ValidationError('取引のステータスが不正なため、評価を完了できませんでした');
      }
      throw error;
    }
  }
}
