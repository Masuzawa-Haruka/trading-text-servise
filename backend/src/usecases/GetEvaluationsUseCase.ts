/**
 * GetEvaluationsUseCase
 *
 * 取引に紐づく評価を取得する。
 * ダブルブラインド方式のため、取引が完了するまでは内容を隠蔽する（空配列を返す）。
 */
import { IEvaluationRepository } from '../domain/repositories/IEvaluationRepository';
import { ITransactionRepository } from '../domain/repositories/ITransactionRepository';
import { EvaluationEntity } from '../domain/evaluation';
import { NotFoundError, ForbiddenError } from '../domain/errors';

export class GetEvaluationsUseCase {
  constructor(
    private readonly evaluationRepository: IEvaluationRepository,
    private readonly transactionRepository: ITransactionRepository
  ) {}

  async execute(transactionId: string, requesterId: string): Promise<EvaluationEntity[]> {
    const transaction = await this.transactionRepository.findById(transactionId);
    if (!transaction) {
      throw new NotFoundError('取引が見つかりません');
    }

    // 当事者チェック
    const isParticipant = transaction.seller_id === requesterId || transaction.buyer_id === requesterId;
    if (!isParticipant) {
      throw new ForbiddenError('この情報を閲覧する権限がありません');
    }

    // ダブルブラインド方式の適用: 完了（completed）していない場合は評価を隠す
    if (transaction.status !== 'completed') {
      return [];
    }

    return await this.evaluationRepository.findByTransactionId(transactionId);
  }
}
