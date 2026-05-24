/**
 * GetMyEvaluationsUseCase
 *
 * 信用スコア画面向けに、自分が受けた表示可能な評価履歴を取得する。
 * ダブルブラインド方式を保つため、通常評価は取引完了後のみリポジトリから返す。
 */
import { IEvaluationRepository } from '../domain/repositories/IEvaluationRepository';
import { ReceivedEvaluationEntity } from '../domain/evaluation';

export class GetMyEvaluationsUseCase {
  constructor(private readonly evaluationRepository: IEvaluationRepository) {}

  async execute(userId: string): Promise<ReceivedEvaluationEntity[]> {
    return await this.evaluationRepository.findVisibleReceivedByUserId(userId);
  }
}
