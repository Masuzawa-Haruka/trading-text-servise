/**
 * RespondScheduleProposalUseCase
 *
 * 提案された候補を承認または却下する。
 * 承認された場合、取引ステータスを scheduled に移行する。
 */
import { IScheduleProposalRepository } from '../domain/repositories/IScheduleProposalRepository';
import { ITransactionRepository } from '../domain/repositories/ITransactionRepository';
import { ScheduleProposalEntity, RespondScheduleProposalInput } from '../domain/scheduleProposal';
import { NotFoundError, ForbiddenError, ValidationError } from '../domain/errors';

export class RespondScheduleProposalUseCase {
  constructor(
    private readonly scheduleProposalRepository: IScheduleProposalRepository,
    private readonly transactionRepository: ITransactionRepository
  ) {}

  async execute(
    proposalId: string,
    input: RespondScheduleProposalInput,
    requesterId: string
  ): Promise<ScheduleProposalEntity> {
    const proposal = await this.scheduleProposalRepository.findById(proposalId);
    if (!proposal) {
      throw new NotFoundError('指定された候補が見つかりません');
    }

    if (proposal.status !== 'pending') {
      throw new ValidationError('この候補は既に回答済みです');
    }

    const transaction = await this.transactionRepository.findById(proposal.transaction_id);
    if (!transaction) {
      throw new NotFoundError('関連する取引が見つかりません');
    }

    // 送信者自身は回答できない
    if (proposal.sender_id === requesterId) {
      throw new ForbiddenError('自分が送信した提案を自分で回答することはできません');
    }

    // 当事者チェック
    const isParticipant = transaction.seller_id === requesterId || transaction.buyer_id === requesterId;
    if (!isParticipant) {
      throw new ForbiddenError('この取引の回答を行う権限がありません');
    }

    if (transaction.status !== 'proposing') {
      throw new ForbiddenError('この取引は現在日程調整できる状態ではありません');
    }

    if (input.status === 'accepted') {
      try {
        return await this.scheduleProposalRepository.acceptProposalAtomically(
          proposalId,
          transaction.id,
          proposal.proposed_datetime,
          proposal.proposed_place
        );
      } catch (error: any) {
        if (error.message === 'ALREADY_RESPONDED') {
          throw new ValidationError('この候補は既に他の操作によって回答済みです');
        }
        if (error.message === 'INVALID_TRANSITION') {
          throw new ValidationError('取引のステータスが不正なため、日程を確定できませんでした');
        }
        throw error;
      }
    } else {
      // rejected の場合。
      // 今回の仕様では「セット」としての却下とするため、本来は一括却下が望ましいが、
      // 単一候補の却下としても実装は可能。
      try {
        return await this.scheduleProposalRepository.rejectProposalAtomically(proposalId);
      } catch (error: any) {
        if (error.message === 'ALREADY_RESPONDED') {
          throw new ValidationError('この候補は既に他の操作によって回答済みです');
        }
        if (error.message === 'NOT_FOUND') {
          throw new NotFoundError('指定された候補が見つかりません');
        }
        throw error;
      }
    }
  }
}
