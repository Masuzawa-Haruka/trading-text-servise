/**
 * EvaluationRepository
 */
import { prisma } from '../../lib/prisma';
import { IEvaluationRepository } from '../../domain/repositories/IEvaluationRepository';
import { EvaluationEntity, PendingEvaluationData, EvaluationType } from '../../domain/evaluation';
import { Evaluation } from '@prisma/client';

export class EvaluationRepository implements IEvaluationRepository {
  async findByTransactionId(transactionId: string): Promise<EvaluationEntity[]> {
    const evaluations = await prisma.evaluation.findMany({
      where: { transaction_id: transactionId },
    });
    return evaluations.map((e) => this.toEntity(e));
  }

  async submitEvaluationAtomically(
    transactionId: string,
    itemId: string,
    reviewerId: string,
    targetUserId: string,
    role: 'seller' | 'buyer',
    type: EvaluationType,
    scoreChange: number
  ): Promise<EvaluationEntity> {
    return await prisma.$transaction(async (tx) => {
      // 1. 取引の評価フラグを更新（updateMany で対象行をロックし競合を防ぐ）
      const updateData = role === 'seller' ? { seller_evaluated: true } : { buyer_evaluated: true };
      const whereCondition = role === 'seller' ? { seller_evaluated: false } : { buyer_evaluated: false };
      
      const txUpdateResult = await tx.transaction.updateMany({
        where: { id: transactionId, status: 'scheduled', ...whereCondition },
        data: updateData,
      });

      if (txUpdateResult.count === 0) {
        throw new Error('INVALID_TRANSITION');
      }

      // 2. 評価ログの保存
      const evaluation = await tx.evaluation.create({
        data: {
          transaction_id: transactionId,
          target_user_id: targetUserId,
          reviewer_id: reviewerId,
          type: type,
          score_change: scoreChange,
        },
      });

      // 3. 最新の取引状態を取得（並行して相手も評価した可能性があるため）
      const currentTx = await tx.transaction.findUniqueOrThrow({
        where: { id: transactionId }
      });

      // 4. 両方 true になったかチェック
      if (currentTx.seller_evaluated && currentTx.buyer_evaluated && currentTx.status !== 'completed') {
        // 取引ステータスを completed に
        await tx.transaction.update({
          where: { id: transactionId },
          data: { status: 'completed' }
        });
        
        // アイテムを completed に
        await tx.item.update({
          where: { id: itemId },
          data: { status: 'completed' }
        });

        // 双方の評価を取得してスコア更新
        const allEvals = await tx.evaluation.findMany({
          where: { transaction_id: transactionId }
        });

        for (const ev of allEvals) {
          await tx.user.update({
            where: { id: ev.target_user_id },
            data: { credit_score: { increment: ev.score_change } }
          });
        }
      }

      return this.toEntity(evaluation);
    });
  }

  private toEntity(e: Evaluation): EvaluationEntity {
    return {
      ...e,
      type: e.type as EvaluationType,
    };
  }
}
