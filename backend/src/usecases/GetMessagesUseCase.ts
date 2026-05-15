/**
 * GetMessagesUseCase
 *
 * 取引に紐づくメッセージ一覧を取得する。
 * scheduled 以降のステータスかつ当事者のみ許可する。
 */
import { IMessageRepository } from '../domain/repositories/IMessageRepository';
import { ITransactionRepository } from '../domain/repositories/ITransactionRepository';
import { MessageEntity } from '../domain/message';
import { NotFoundError, ForbiddenError } from '../domain/errors';

export class GetMessagesUseCase {
  constructor(
    private readonly messageRepository: IMessageRepository,
    private readonly transactionRepository: ITransactionRepository
  ) {}

  async execute(transactionId: string, requesterId: string): Promise<MessageEntity[]> {
    const transaction = await this.transactionRepository.findById(transactionId);
    if (!transaction) {
      throw new NotFoundError('取引が見つかりません');
    }

    // 当事者チェック
    const isParticipant = transaction.seller_id === requesterId || transaction.buyer_id === requesterId;
    if (!isParticipant) {
      throw new ForbiddenError('この取引のメッセージを閲覧する権限がありません');
    }

    // ステータスチェック (proposing 時は閲覧不可)
    if (transaction.status === 'proposing') {
      throw new ForbiddenError('日時確定前はメッセージボードにアクセスできません');
    }

    return await this.messageRepository.findByTransactionId(transactionId);
  }
}
