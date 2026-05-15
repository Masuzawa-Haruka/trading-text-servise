/**
 * SendScheduleProposalUseCase
 *
 * 日程候補を最大5つ送信する。既存のpending候補は無効化する。
 */
import { IScheduleProposalRepository } from '../domain/repositories/IScheduleProposalRepository';
import { ITransactionRepository } from '../domain/repositories/ITransactionRepository';
import { SendScheduleProposalInput } from '../domain/scheduleProposal';
import { NotFoundError, ForbiddenError, ValidationError } from '../domain/errors';

export class SendScheduleProposalUseCase {
  constructor(
    private readonly scheduleProposalRepository: IScheduleProposalRepository,
    private readonly transactionRepository: ITransactionRepository
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

    // 既存の pending 候補を却下 (リセット)
    await this.scheduleProposalRepository.rejectAllPendingByTransactionId(input.transaction_id);

    // 新しい候補を作成
    await this.scheduleProposalRepository.createMany(
      input.transaction_id,
      input.sender_id,
      input.candidates
    );
  }
}
