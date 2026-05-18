/**
 * CancellationRepository
 */
import { prisma } from '../../lib/prisma';
import { ICancellationRepository } from '../../domain/repositories/ICancellationRepository';
import { CancellationRequestEntity, CancellationStatus } from '../../domain/cancellation';
import { CancellationRequest } from '@prisma/client';

export class CancellationRepository implements ICancellationRepository {
  async findById(id: string): Promise<CancellationRequestEntity | null> {
    const request = await prisma.cancellationRequest.findUnique({
      where: { id },
    });
    return request ? this.toEntity(request) : null;
  }

  async findByTransactionId(transactionId: string): Promise<CancellationRequestEntity | null> {
    const request = await prisma.cancellationRequest.findUnique({
      where: { transaction_id: transactionId },
    });
    return request ? this.toEntity(request) : null;
  }

  async createCancellationRequest(
    transactionId: string,
    requesterId: string,
    reason?: string
  ): Promise<CancellationRequestEntity> {
    const request = await prisma.cancellationRequest.create({
      data: {
        transaction_id: transactionId,
        requester_id: requesterId,
        reason: reason || null,
        status: 'pending',
      },
    });
    return this.toEntity(request);
  }

  async rejectCancellationRequest(cancellationId: string): Promise<CancellationRequestEntity> {
    const request = await prisma.cancellationRequest.update({
      where: { id: cancellationId },
      data: { status: 'rejected' },
    });
    return this.toEntity(request);
  }

  async acceptCancellationAtomically(
    cancellationId: string,
    transactionId: string,
    itemId: string,
    requesterId: string,
    responderId: string
  ): Promise<CancellationRequestEntity> {
    return await prisma.$transaction(async (tx) => {
      // 1. キャンセルリクエストを accepted に更新
      const updatedRequest = await tx.cancellationRequest.update({
        where: { id: cancellationId },
        data: { status: 'accepted' },
      });

      // 2. 取引を canceled に更新
      const txUpdateResult = await tx.transaction.updateMany({
        where: { id: transactionId, status: 'scheduled' },
        data: { status: 'canceled' },
      });

      if (txUpdateResult.count === 0) {
        throw new Error('INVALID_TRANSITION');
      }

      // 3. アイテムを available に戻す
      await tx.item.update({
        where: { id: itemId },
        data: { status: 'available' },
      });

      // 4. ペナルティ（-10点）の評価ログを作成
      await tx.evaluation.create({
        data: {
          transaction_id: transactionId,
          target_user_id: requesterId,
          reviewer_id: responderId,
          type: 'cancel',
          score_change: -10,
        },
      });

      // 5. 申請者の信用スコアを -10 点更新
      await tx.user.update({
        where: { id: requesterId },
        data: { credit_score: { decrement: 10 } },
      });

      return this.toEntity(updatedRequest);
    });
  }

  async executeNoShowAtomically(
    transactionId: string,
    itemId: string,
    reporterId: string,
    targetUserId: string
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // 1. 取引を canceled に更新
      const txUpdateResult = await tx.transaction.updateMany({
        where: { id: transactionId, status: 'scheduled' },
        data: { status: 'canceled' },
      });

      if (txUpdateResult.count === 0) {
        throw new Error('INVALID_TRANSITION');
      }

      // 2. アイテムを available に戻す
      await tx.item.update({
        where: { id: itemId },
        data: { status: 'available' },
      });

      // 3. ペナルティ（-30点）の評価ログを作成
      await tx.evaluation.create({
        data: {
          transaction_id: transactionId,
          target_user_id: targetUserId,
          reviewer_id: reporterId,
          type: 'no_show',
          score_change: -30,
        },
      });

      // 4. ドタキャン対象者の信用スコアを -30 点更新
      await tx.user.update({
        where: { id: targetUserId },
        data: { credit_score: { decrement: 30 } },
      });
    });
  }

  private toEntity(r: CancellationRequest): CancellationRequestEntity {
    return {
      ...r,
      status: r.status as CancellationStatus,
    };
  }
}
