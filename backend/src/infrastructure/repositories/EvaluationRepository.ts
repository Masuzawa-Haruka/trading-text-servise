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

  async submitFirstEvaluationAtomically(
    transactionId: string,
    reviewerId: string,
    targetUserId: string,
    role: 'seller' | 'buyer',
    type: EvaluationType,
    scoreChange: number
  ): Promise<EvaluationEntity> {
    return await prisma.$transaction(async (tx) => {
      // 1. 取引の評価フラグを更新
      const updateData = role === 'seller' ? { seller_evaluated: true } : { buyer_evaluated: true };
      
      const txUpdateResult = await tx.transaction.updateMany({
        where: { id: transactionId, status: 'scheduled' },
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

      return this.toEntity(evaluation);
    });
  }

  async submitSecondEvaluationAtomically(
    transactionId: string,
    itemId: string,
    reviewerId: string,
    targetUserId: string,
    role: 'seller' | 'buyer',
    type: EvaluationType,
    scoreChange: number,
    counterpartEvaluation: PendingEvaluationData
  ): Promise<EvaluationEntity> {
    return await prisma.$transaction(async (tx) => {
      // 1. 取引の評価フラグを更新し、ステータスを completed にする
      const updateData = role === 'seller' ? { seller_evaluated: true } : { buyer_evaluated: true };
      
      const txUpdateResult = await tx.transaction.updateMany({
        where: { id: transactionId, status: 'scheduled' },
        data: {
          ...updateData,
          status: 'completed',
        },
      });

      if (txUpdateResult.count === 0) {
        throw new Error('INVALID_TRANSITION');
      }

      // 2. アイテムのステータスを completed に更新
      await tx.item.update({
        where: { id: itemId },
        data: { status: 'completed' },
      });

      // 3. 今回の評価ログの保存
      const evaluation = await tx.evaluation.create({
        data: {
          transaction_id: transactionId,
          target_user_id: targetUserId,
          reviewer_id: reviewerId,
          type: type,
          score_change: scoreChange,
        },
      });

      // 4. 双方の信用スコア（credit_score）を更新
      // 今回の評価による、相手へのスコア加算
      await tx.user.update({
        where: { id: targetUserId },
        data: {
          credit_score: { increment: scoreChange },
        },
      });

      // 1人目の評価による、自分へのスコア加算
      await tx.user.update({
        where: { id: counterpartEvaluation.target_user_id }, // これは自分(reviewerId)のはず
        data: {
          credit_score: { increment: counterpartEvaluation.score_change },
        },
      });

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
