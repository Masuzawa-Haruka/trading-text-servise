/**
 * SubmitEvaluationUseCase
 *
 * 相互評価を送信する。
 * ダブルブラインド方式を採用し、2人目の評価完了時にまとめてスコア・ステータスを更新する。
 */
import { IEvaluationRepository } from '../domain/repositories/IEvaluationRepository';
import { ITransactionRepository } from '../domain/repositories/ITransactionRepository';
import { INotificationRepository } from '../domain/repositories/INotificationRepository';
import { EvaluationEntity, SubmitEvaluationInput } from '../domain/evaluation';
import { NotFoundError, ForbiddenError, ValidationError } from '../domain/errors';

export class SubmitEvaluationUseCase {
  constructor(
    private readonly evaluationRepository: IEvaluationRepository,
    private readonly transactionRepository: ITransactionRepository,
    private readonly notificationRepository?: INotificationRepository
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

    if (transaction.status !== 'scheduled') {
      throw new ForbiddenError('評価は日時確定後の取引でのみ行えます');
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

    try {
      const evaluation = await this.evaluationRepository.submitEvaluationAtomically(
        transaction_id,
        transaction.item_id,
        requesterId,
        targetUserId,
        role,
        type,
        scoreChange
      );
      await this.createEvaluationNotifications(
        transaction_id,
        requesterId,
        targetUserId,
        counterpartHasEvaluated
      );
      return evaluation;
    } catch (error: any) {
      if (error.message === 'INVALID_TRANSITION') {
        throw new ValidationError('取引のステータスが不正なため、評価を完了できませんでした');
      }
      throw error;
    }
  }

  private async createEvaluationNotifications(
    transactionId: string,
    requesterId: string,
    targetUserId: string,
    counterpartHasEvaluated: boolean
  ): Promise<void> {
    if (!this.notificationRepository) return;

    const notifications = counterpartHasEvaluated
      ? [
          {
            user_id: targetUserId,
            actor_id: requesterId,
            title: '評価が完了しました',
            type: 'info' as const,
            transaction_id: transactionId,
          },
          {
            user_id: requesterId,
            actor_id: targetUserId,
            title: '評価が完了しました',
            type: 'info' as const,
            transaction_id: transactionId,
          },
        ]
      : [
          {
            user_id: targetUserId,
            actor_id: requesterId,
            title: '取引評価を送信してください',
            type: 'action_required' as const,
            transaction_id: transactionId,
          },
        ];

    try {
      await Promise.all(notifications.map((notification) => this.notificationRepository!.create(notification)));
    } catch (error) {
      console.error('[SubmitEvaluationUseCase.createNotification]', error);
    }
  }
}
