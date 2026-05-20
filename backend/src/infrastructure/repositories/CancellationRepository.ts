/**
 * CancellationRepository
 *
 * cancellation_requests テーブルに対する DB 操作を担う。
 * テーブル名・status 定義は現行のまま維持し、status='accepted' を「即時実行済み」として使用する。
 */
import { prisma } from '../../lib/prisma';
import { ICancellationRepository } from '../../domain/repositories/ICancellationRepository';
import { CancellationRequestEntity, CancellationStatus } from '../../domain/cancellation';
import { CancellationRequest, Prisma } from '@prisma/client';

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

  /**
   * キャンセルを 1 トランザクションで原子的に実行する。
   *
   * 処理内容:
   *   1. Transaction.status を scheduled → canceled に更新（楽観ロック）
   *   2. Item.status を available に戻す
   *   3. cancellation_requests レコードを新規作成（重複は ALREADY_CANCELED で弾く）
   *   4. Evaluation（cancel, -10）を作成
   *   5. User.credit_score を -10 更新
   *
   * upsert を使わず create にすることで、重複送信時に DB の UNIQUE 制約エラーを
   * キャッチして ALREADY_CANCELED を投げる。二重キャンセルによる副作用の多重適用を防ぐ。
   */
  async executeCancellationAtomically(
    transactionId: string,
    itemId: string,
    requesterId: string,
    reason?: string
  ): Promise<CancellationRequestEntity> {
    return await prisma.$transaction(async (tx) => {
      // 1. 取引を scheduled → canceled に更新（楽観ロック）
      const txUpdateResult = await tx.transaction.updateMany({
        where: { id: transactionId, status: 'scheduled' },
        data: { status: 'canceled' },
      });

      if (txUpdateResult.count === 0) {
        // scheduled でないなら、既にキャンセル済み or 他の状態
        const existing = await tx.transaction.findUnique({ where: { id: transactionId }, select: { status: true } });
        if (existing?.status === 'canceled') {
          throw new Error('ALREADY_CANCELED');
        }
        throw new Error('INVALID_TRANSITION');
      }

      // 2. アイテムを available に戻す
      await tx.item.update({
        where: { id: itemId },
        data: { status: 'available' },
      });

      // 3. キャンセル履歴を新規作成（UNIQUE 制約違反 → ALREADY_CANCELED）
      let cancellationRequest: CancellationRequest;
      try {
        cancellationRequest = await tx.cancellationRequest.create({
          data: {
            transaction_id: transactionId,
            requester_id: requesterId,
            reason: reason ?? null,
            status: 'accepted', // 'accepted' = 即時実行済み
          },
        });
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          throw new Error('ALREADY_CANCELED');
        }
        throw error;
      }

      // 4. ペナルティ評価ログを作成（cancel: -10点）
      await tx.evaluation.create({
        data: {
          transaction_id: transactionId,
          target_user_id: requesterId,
          reviewer_id: null,
          type: 'cancel',
          score_change: -10,
        },
      });

      // 5. 申請者の信用スコアを -10 更新
      await tx.user.update({
        where: { id: requesterId },
        data: { credit_score: { decrement: 10 } },
      });

      return this.toEntity(cancellationRequest);
    });
  }

  /**
   * ドタキャン報告を 1 トランザクションで原子的に実行する。
   *
   * 処理内容:
   *   1. Transaction.status を scheduled → canceled に更新（楽観ロック）
   *   2. Item.status を available に戻す
   *   3. Evaluation（no_show, -30）を作成
   *   4. targetUser.credit_score を -30 更新
   */
  async executeNoShowAtomically(
    transactionId: string,
    itemId: string,
    reporterId: string,
    targetUserId: string
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // 1. 取引を scheduled → canceled に更新（楽観ロック）
      const txUpdateResult = await tx.transaction.updateMany({
        where: { id: transactionId, status: 'scheduled' },
        data: { status: 'canceled' },
      });

      if (txUpdateResult.count === 0) {
        const existing = await tx.transaction.findUnique({ where: { id: transactionId }, select: { status: true } });
        if (existing?.status === 'canceled') {
          throw new Error('ALREADY_CANCELED');
        }
        throw new Error('INVALID_TRANSITION');
      }

      // 2. アイテムを available に戻す
      await tx.item.update({
        where: { id: itemId },
        data: { status: 'available' },
      });

      // 3. ペナルティ評価ログを作成（no_show: -30点）
      await tx.evaluation.create({
        data: {
          transaction_id: transactionId,
          target_user_id: targetUserId,
          reviewer_id: reporterId,
          type: 'no_show',
          score_change: -30,
        },
      });

      // 4. ドタキャン対象者の信用スコアを -30 更新
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

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
