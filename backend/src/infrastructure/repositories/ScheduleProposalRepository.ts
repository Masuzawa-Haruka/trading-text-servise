/**
 * ScheduleProposalRepository
 */
import { prisma } from '../../lib/prisma';
import { IScheduleProposalRepository } from '../../domain/repositories/IScheduleProposalRepository';
import { ScheduleProposalEntity, ScheduleCandidateInput, ProposalStatus } from '../../domain/scheduleProposal';
import { ScheduleProposal } from '@prisma/client';

export class ScheduleProposalRepository implements IScheduleProposalRepository {
  /**
   * 既存の pending 候補を却下し、新しい候補を一括作成する。
   * これにより、「提案セット」の差し替えが原子的に行われる。
   */
  async replaceProposalsAtomically(
    transactionId: string,
    senderId: string,
    candidates: ScheduleCandidateInput[]
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // 既存のpending候補を無効化
      await tx.scheduleProposal.updateMany({
        where: {
          transaction_id: transactionId,
          status: 'pending',
        },
        data: {
          status: 'rejected',
        },
      });

      // 新規作成
      await tx.scheduleProposal.createMany({
        data: candidates.map(c => ({
          transaction_id: transactionId,
          sender_id: senderId,
          proposed_datetime: new Date(c.proposed_datetime),
          proposed_place: c.proposed_place,
          status: 'pending',
        })),
      });
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

  async rejectProposalAtomically(id: string): Promise<ScheduleProposalEntity> {
    const result = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.scheduleProposal.updateMany({
        where: { id, status: 'pending' },
        data: { status: 'rejected' },
      });

      if (updateResult.count === 0) {
        throw new Error('ALREADY_RESPONDED');
      }

      const updated = await tx.scheduleProposal.findUnique({ where: { id } });
      if (!updated) throw new Error('NOT_FOUND');
      return updated;
    });

    return this.toEntity(result);
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
      const txUpdateResult = await tx.transaction.updateMany({
        where: { id: transactionId, status: 'proposing' },
        data: {
          status: 'scheduled',
          meeting_datetime: acceptedDatetime,
          meeting_place: acceptedPlace,
        },
      });

      if (txUpdateResult.count === 0) {
        throw new Error('INVALID_TRANSITION');
      }

      const updated = await tx.scheduleProposal.findUniqueOrThrow({
        where: { id: proposalId },
      });
      return this.toEntity(updated);
    });
  }

  private toEntity(p: ScheduleProposal): ScheduleProposalEntity {
    return {
      ...p,
      status: p.status as ProposalStatus,
    };
  }
}
