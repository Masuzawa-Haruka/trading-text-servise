import { ReportEntity } from '../domain/report';
import { IReportRepository } from '../domain/repositories/IReportRepository';
import { ITransactionRepository } from '../domain/repositories/ITransactionRepository';
import { ForbiddenError, NotFoundError, ValidationError } from '../domain/errors';

export type SubmitReportInput = {
  transaction_id: string;
  reported_user_id: string;
  reason: string;
  detail: string;
  evidence_image_urls?: string[];
};

export class SubmitReportUseCase {
  constructor(
    private readonly reportRepository: IReportRepository,
    private readonly transactionRepository: ITransactionRepository,
  ) {}

  async execute(input: SubmitReportInput, reporterId: string): Promise<ReportEntity> {
    const transaction = await this.transactionRepository.findById(input.transaction_id);
    if (!transaction) {
      throw new NotFoundError('取引が見つかりません');
    }

    const isSeller = transaction.seller_id === reporterId;
    const isBuyer = transaction.buyer_id === reporterId;
    if (!isSeller && !isBuyer) {
      throw new ForbiddenError('この取引を通報する権限がありません');
    }

    const counterpartyId = isSeller ? transaction.buyer_id : transaction.seller_id;
    if (input.reported_user_id !== counterpartyId) {
      throw new ValidationError('対象ユーザーは取引相手を指定してください');
    }

    return this.reportRepository.create({
      ...input,
      reporter_id: reporterId,
      evidence_image_urls: input.evidence_image_urls ?? [],
    });
  }
}
