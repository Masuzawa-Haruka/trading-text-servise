/**
 * SendScheduleProposalUseCase
 *
 * 日程候補を最大5つ送信する。既存のpending候補は無効化する。
 */
import { IScheduleProposalRepository } from '../domain/repositories/IScheduleProposalRepository';
import { ITransactionRepository } from '../domain/repositories/ITransactionRepository';
import { INotificationRepository } from '../domain/repositories/INotificationRepository';
import { SendScheduleProposalInput } from '../domain/scheduleProposal';
import { NotFoundError, ForbiddenError, ValidationError } from '../domain/errors';

export class SendScheduleProposalUseCase {
  constructor(
    private readonly scheduleProposalRepository: IScheduleProposalRepository,
    private readonly transactionRepository: ITransactionRepository,
    private readonly notificationRepository?: INotificationRepository
  ) {}

  async execute(input: SendScheduleProposalInput): Promise<void> {
    if (input.candidates.length === 0) {
      throw new ValidationError('候補を1つ以上指定してください');
    }
    if (input.candidates.length > 5) {
      throw new ValidationError('候補は最大5つまでです');
    }

    const transaction = await this.transactionRepository.findById(input.transaction_id);
    if (!transaction) {
      throw new NotFoundError('取引が見つかりません');
    }

    // 当事者チェック
    const isParticipant = transaction.seller_id === input.sender_id || transaction.buyer_id === input.sender_id;
    if (!isParticipant) {
      throw new ForbiddenError('この取引の提案を行う権限がありません');
    }

    // ステータスチェック (proposing のみ)
    if (transaction.status !== 'proposing') {
      throw new ForbiddenError('日程調整ができる状態ではありません');
    }

    // 既存の pending 候補を却下し、新しい候補を作成する処理を原子的に実行
    await this.scheduleProposalRepository.replaceProposalsAtomically(
      input.transaction_id,
      input.sender_id,
      input.candidates
    );

    const recipientId = transaction.seller_id === input.sender_id ? transaction.buyer_id : transaction.seller_id;
    await this.createNotificationSafely({
      user_id: recipientId,
      actor_id: input.sender_id,
      title: '日程提案が届いています',
      type: 'action_required',
      transaction_id: input.transaction_id,
    });
  }

  private async createNotificationSafely(input: {
    user_id: string;
    actor_id: string;
    title: string;
    type: 'info' | 'action_required';
    transaction_id: string;
  }): Promise<void> {
    if (!this.notificationRepository) return;

    try {
      await this.notificationRepository.create(input);
    } catch (error) {
      console.error('[SendScheduleProposalUseCase.createNotification]', error);
    }
  }
}
