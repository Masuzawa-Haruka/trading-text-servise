import { ICancellationRepository } from '../domain/repositories/ICancellationRepository';
import { ITransactionRepository } from '../domain/repositories/ITransactionRepository';
import { CancellationRequestEntity, RequestCancellationInput } from '../domain/cancellation';
import { NotFoundError, ForbiddenError, ValidationError } from '../domain/errors';

export class RequestCancellationUseCase {
  constructor(
    private readonly cancellationRepository: ICancellationRepository,
    private readonly transactionRepository: ITransactionRepository
  ) {}

  async execute(input: RequestCancellationInput, requesterId: string): Promise<CancellationRequestEntity> {
    const { transaction_id, reason } = input;

    const transaction = await this.transactionRepository.findById(transaction_id);
    if (!transaction) {
      throw new NotFoundError('取引が見つかりません');
    }

    // 1. 権限チェック (当事者であること)
    const isSeller = transaction.seller_id === requesterId;
    const isBuyer = transaction.buyer_id === requesterId;
    if (!isSeller && !isBuyer) {
      throw new ForbiddenError('この取引のキャンセル申請を行う権限がありません');
    }

    // 2. 取引ステータスチェック (日時・場所確定後の取引でのみ行える)
    if (transaction.status !== 'scheduled') {
      throw new ForbiddenError('キャンセル申請は日時確定後の取引でのみ行えます');
    }

    // 3. 既にキャンセル申請が存在していないかチェック
    const existingRequest = await this.cancellationRepository.findByTransactionId(transaction_id);
    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        throw new ValidationError('既にキャンセル申請が送信されています');
      }
      if (existingRequest.status === 'accepted') {
        throw new ValidationError('この取引は既にキャンセルされています');
      }
    }

    return await this.cancellationRepository.createCancellationRequest(
      transaction_id,
      requesterId,
      reason
    );
  }
}
