/**
 * SendMessageUseCase
 *
 * 取引連絡ボードにメッセージを投稿する。
 * scheduled ステータスの時のみ許可する。
 */
import { IMessageRepository } from '../domain/repositories/IMessageRepository';
import { ITransactionRepository } from '../domain/repositories/ITransactionRepository';
import { INotificationRepository } from '../domain/repositories/INotificationRepository';
import { MessageEntity, SendMessageInput } from '../domain/message';
import { NotFoundError, ForbiddenError, ValidationError } from '../domain/errors';

export class SendMessageUseCase {
  constructor(
    private readonly messageRepository: IMessageRepository,
    private readonly transactionRepository: ITransactionRepository,
    private readonly notificationRepository?: INotificationRepository
  ) {}

  async execute(input: SendMessageInput): Promise<MessageEntity> {
    const { transaction_id, sender_id, content } = input;

    // バリデーション
    if (!content || content.trim() === '') {
      throw new ValidationError('メッセージ内容を入力してください');
    }
    if (content.length > 1000) {
      throw new ValidationError('メッセージは1000文字以内で入力してください');
    }

    const transaction = await this.transactionRepository.findById(transaction_id);
    if (!transaction) {
      throw new NotFoundError('取引が見つかりません');
    }

    // 当事者チェック
    const isParticipant = transaction.seller_id === sender_id || transaction.buyer_id === sender_id;
    if (!isParticipant) {
      throw new ForbiddenError('この取引にメッセージを投稿する権限がありません');
    }

    // ステータスチェック (scheduled の時のみ投稿可能)
    if (transaction.status === 'proposing') {
      throw new ForbiddenError('日時確定前はメッセージ投稿を利用できません');
    }
    if (transaction.status === 'completed' || transaction.status === 'canceled') {
      throw new ForbiddenError('終了した取引にはメッセージを投稿できません');
    }

    const message = await this.messageRepository.create(transaction_id, sender_id, content);
    const recipientId = transaction.seller_id === sender_id ? transaction.buyer_id : transaction.seller_id;

    await this.createNotificationSafely({
      user_id: recipientId,
      actor_id: sender_id,
      title: '取引メッセージが届きました',
      type: 'info',
      transaction_id,
    });

    return message;
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
      console.error('[SendMessageUseCase.createNotification]', error);
    }
  }
}
