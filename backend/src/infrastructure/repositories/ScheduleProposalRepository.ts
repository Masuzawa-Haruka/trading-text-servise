/**
 * ScheduleProposalRepository
 */
import { prisma } from '../../lib/prisma';
import { IScheduleProposalRepository } from '../../domain/repositories/IScheduleProposalRepository';
import { ScheduleProposalEntity, ScheduleCandidateInput, ProposalStatus } from '../../domain/scheduleProposal';
import { ScheduleProposal, ScheduleCandidate } from '@prisma/client';

type ScheduleProposalWithCandidates = ScheduleProposal & {
  candidates: ScheduleCandidate[];
};

export class ScheduleProposalRepository implements IScheduleProposalRepository {
  /**
   * 既存の pending 提案を却下し、新しい提案（親）と日時候補（最大5件）を一括作成する。
   * これにより、「提案セット」の差し替えが原子的に行われる。
   */
  async replaceProposalsAtomically(
    transactionId: string,
    senderId: string,
    candidates: ScheduleCandidateInput[]
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // 1. 既存の pending 提案を取得
      const pendingProposals = await tx.scheduleProposal.findMany({
        where: {
          transaction_id: transactionId,
          status: 'pending',
        },
        select: { id: true },
      });

      const pendingIds = pendingProposals.map(p => p.id);

      if (pendingIds.length > 0) {
        // 親提案を却下
        await tx.scheduleProposal.updateMany({
          where: { id: { in: pendingIds } },
          data: { status: 'rejected' },
        });

        // 紐づく候補も却下
        await tx.scheduleCandidate.updateMany({
          where: { proposal_id: { in: pendingIds }, status: 'pending' },
          data: { status: 'rejected' },
        });
      }

      // 2. 新規の親提案を作成
      const newProposal = await tx.scheduleProposal.create({
        data: {
          transaction_id: transactionId,
          sender_id: senderId,
          status: 'pending',
        },
      });

      // 3. その候補（スロット）を作成
      await tx.scheduleCandidate.createMany({
        data: candidates.map(c => ({
          proposal_id: newProposal.id,
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
      include: { candidates: true },
    });
    return proposal ? this.toEntity(proposal) : null;
  }

  async findByTransactionId(transactionId: string): Promise<ScheduleProposalEntity[]> {
    const proposals = await prisma.scheduleProposal.findMany({
      where: { transaction_id: transactionId },
      include: { candidates: true },
      orderBy: { created_at: 'desc' },
    });
    return proposals.map(p => this.toEntity(p));
  }

  async rejectProposalAtomically(proposalId: string): Promise<ScheduleProposalEntity> {
    const result = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.scheduleProposal.updateMany({
        where: { id: proposalId, status: 'pending' },
        data: { status: 'rejected' },
      });

      if (updateResult.count === 0) {
        throw new Error('ALREADY_RESPONDED');
      }

      // 候補もすべて却下に更新
      await tx.scheduleCandidate.updateMany({
        where: { proposal_id: proposalId, status: 'pending' },
        data: { status: 'rejected' },
      });

      const updated = await tx.scheduleProposal.findUnique({
        where: { id: proposalId },
        include: { candidates: true },
      });
      if (!updated) throw new Error('NOT_FOUND');
      return updated;
    });

    return this.toEntity(result);
  }

  async acceptProposalAtomically(
    proposalId: string,
    transactionId: string,
    candidateId: string
  ): Promise<ScheduleProposalEntity> {
    return await prisma.$transaction(async (tx) => {
      // 1. 指定された候補（Candidate）を承認
      const updateResult = await tx.scheduleCandidate.updateMany({
        where: { id: candidateId, proposal_id: proposalId, status: 'pending' },
        data: { status: 'accepted' },
      });

      if (updateResult.count === 0) {
        throw new Error('ALREADY_RESPONDED');
      }

      // 2. この提案（Proposal）の他の候補スロットをすべて却下
      await tx.scheduleCandidate.updateMany({
        where: {
          proposal_id: proposalId,
          id: { not: candidateId },
          status: 'pending',
        },
        data: { status: 'rejected' },
      });

      // 3. 親提案（Proposal）のステータスを accepted に更新
      await tx.scheduleProposal.update({
        where: { id: proposalId },
        data: { status: 'accepted' },
      });

      // 4. 他のすべての保留中の提案と候補を一括却下
      const otherProposals = await tx.scheduleProposal.findMany({
        where: {
          transaction_id: transactionId,
          id: { not: proposalId },
          status: 'pending',
        },
        select: { id: true },
      });

      const otherProposalIds = otherProposals.map(p => p.id);
      if (otherProposalIds.length > 0) {
        // 親提案を却下
        await tx.scheduleProposal.updateMany({
          where: { id: { in: otherProposalIds } },
          data: { status: 'rejected' },
        });

        // 候補も却下
        await tx.scheduleCandidate.updateMany({
          where: { proposal_id: { in: otherProposalIds }, status: 'pending' },
          data: { status: 'rejected' },
        });
      }

      // 5. 承認された候補の情報を取得
      const acceptedCandidate = await tx.scheduleCandidate.findUniqueOrThrow({
        where: { id: candidateId },
      });

      // 6. 取引情報を更新（status -> scheduled, 日時・場所の反映）
      const txUpdateResult = await tx.transaction.updateMany({
        where: { id: transactionId, status: 'proposing' },
        data: {
          status: 'scheduled',
          meeting_datetime: acceptedCandidate.proposed_datetime,
          meeting_place: acceptedCandidate.proposed_place,
        },
      });

      if (txUpdateResult.count === 0) {
        throw new Error('INVALID_TRANSITION');
      }

      const updated = await tx.scheduleProposal.findUniqueOrThrow({
        where: { id: proposalId },
        include: { candidates: true },
      });
      return this.toEntity(updated);
    });
  }

  private toEntity(p: ScheduleProposalWithCandidates): ScheduleProposalEntity {
    return {
      id: p.id,
      transaction_id: p.transaction_id,
      sender_id: p.sender_id,
      status: p.status as ProposalStatus,
      created_at: p.created_at,
      updated_at: p.updated_at,
      candidates: p.candidates.map(c => ({
        id: c.id,
        proposal_id: c.proposal_id,
        proposed_datetime: c.proposed_datetime,
        proposed_place: c.proposed_place,
        status: c.status as ProposalStatus,
        created_at: c.created_at,
        updated_at: c.updated_at,
      })),
    };
  }
}

