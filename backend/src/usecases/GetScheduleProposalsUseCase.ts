/**
 * GetScheduleProposalsUseCase
 *
 * 取引に紐づく候補一覧を当事者のみに返す。
 */
import { IScheduleProposalRepository } from '../domain/repositories/IScheduleProposalRepository';
import { ITransactionRepository } from '../domain/repositories/ITransactionRepository';
import { ScheduleProposalEntity } from '../domain/scheduleProposal';
import { NotFoundError, ForbiddenError } from '../domain/errors';

export class GetScheduleProposalsUseCase {
  constructor(
    private readonly scheduleProposalRepository: IScheduleProposalRepository,
    private readonly transactionRepository: ITransactionRepository
  ) {}

  async execute(transactionId: string, requesterId: string): Promise<ScheduleProposalEntity[]> {
    const transaction = await this.transactionRepository.findById(transactionId);
    if (!transaction) {
      throw new NotFoundError('取引が見つかりません');
    }

    const isParticipant = transaction.seller_id === requesterId || transaction.buyer_id === requesterId;
    if (!isParticipant) {
      throw new ForbiddenError('この取引の情報を閲覧する権限がありません');
    }

    return await this.scheduleProposalRepository.findByTransactionId(transactionId);
  }
}
