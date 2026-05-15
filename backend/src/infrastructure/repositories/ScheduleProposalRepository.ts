/**
 * ScheduleProposalRepository
 */
import { prisma } from '../../lib/prisma';
import { IScheduleProposalRepository } from '../../domain/repositories/IScheduleProposalRepository';
import { ScheduleProposalEntity, ScheduleCandidateInput, ProposalStatus } from '../../domain/scheduleProposal';
import { ScheduleProposal } from '@prisma/client';

export class ScheduleProposalRepository implements IScheduleProposalRepository {
  /**
   * 複数の候補を一括作成する。
   * トランザクションは呼び出し側（UseCase）が意識しなくても良いよう、内部で完結させることもできるが、
   * 今回はシンプルに `createMany` を使用。
   */
  async createMany(
    transactionId: string,
    senderId: string,
    candidates: ScheduleCandidateInput[]
  ): Promise<void> {
    await prisma.scheduleProposal.createMany({
      data: candidates.map(c => ({
        transaction_id: transactionId,
        sender_id: senderId,
        proposed_datetime: new Date(c.proposed_datetime),
        proposed_place: c.proposed_place,
        status: 'pending',
      })),
    });
  }

  async findById(id: string): Promise<ScheduleProposalEntity | null> {
    const proposal = await prisma.scheduleProposal.findUnique({
      where: { id },
    });
    return proposal ? this.toEntity(proposal) : null;
  }

  async findByTransactionId(transactionId: string): Promise<ScheduleProposalEntity[]> {
    const proposals = await prisma.scheduleProposal.findMany({
      where: { transaction_id: transactionId },
      orderBy: { created_at: 'desc' },
    });
    return proposals.map(p => this.toEntity(p));
  }

  async rejectAllPendingByTransactionId(transactionId: string): Promise<void> {
    await prisma.scheduleProposal.updateMany({
      where: {
        transaction_id: transactionId,
        status: 'pending',
      },
      data: {
        status: 'rejected',
      },
    });
  }

  async acceptProposalAtomically(
    proposalId: string,
    transactionId: string,
    acceptedDatetime: Date,
    acceptedPlace: string
  ): Promise<ScheduleProposalEntity> {
    return await prisma.$transaction(async (tx) => {
      // 1. 指定された候補を承認
      // 競合回避のため updateMany + count チェック
      const updateResult = await tx.scheduleProposal.updateMany({
        where: { id: proposalId, status: 'pending' },
        data: { status: 'accepted' },
      });

      if (updateResult.count === 0) {
        throw new Error('ALREADY_RESPONDED');
      }

      // 2. 他の保留中の候補をすべて却下
      await tx.scheduleProposal.updateMany({
        where: {
          transaction_id: transactionId,
          id: { not: proposalId },
          status: 'pending',
        },
        data: { status: 'rejected' },
      });

      // 3. 取引情報を更新（status -> scheduled, 日時・場所の反映）
      await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'scheduled',
          meeting_datetime: acceptedDatetime,
          meeting_place: acceptedPlace,
        },
      });

      const updated = await tx.scheduleProposal.findUniqueOrThrow({
        where: { id: proposalId },
      });
      return this.toEntity(updated);
    });
  }

  async updateStatus(id: string, status: ProposalStatus): Promise<ScheduleProposalEntity> {
    const proposal = await prisma.scheduleProposal.update({
      where: { id },
      data: { status },
    });
    return this.toEntity(proposal);
  }

  private toEntity(p: ScheduleProposal): ScheduleProposalEntity {
    return {
      ...p,
      status: p.status as ProposalStatus,
    };
  }
}
