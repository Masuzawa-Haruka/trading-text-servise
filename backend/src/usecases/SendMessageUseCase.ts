/**
 * SendMessageUseCase
 *
 * 取引連絡ボードにメッセージを投稿する。
 * scheduled ステータスの時のみ許可する。
 */
import { IMessageRepository } from '../domain/repositories/IMessageRepository';
import { ITransactionRepository } from '../domain/repositories/ITransactionRepository';
import { MessageEntity, SendMessageInput } from '../domain/message';
import { NotFoundError, ForbiddenError, ValidationError } from '../domain/errors';

export class SendMessageUseCase {
  constructor(
    private readonly messageRepository: IMessageRepository,
    private readonly transactionRepository: ITransactionRepository
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

    return await this.messageRepository.create(transaction_id, sender_id, content);
  }
}
