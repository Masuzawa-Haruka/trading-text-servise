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
      throw new ForbiddenError('この取引のキャンセルを実行する権限がありません');
    }

    // 2. 取引ステータスチェック (日時・場所確定後の取引でのみ行える)
    if (transaction.status !== 'scheduled') {
      throw new ForbiddenError('キャンセル実行は日時確定後の取引でのみ行えます');
    }

    try {
      return await this.cancellationRepository.executeCancellationAtomically(
        transaction_id,
        transaction.item_id,
        requesterId,
        reason
      );
    } catch (error: any) {
      if (error.message === 'INVALID_TRANSITION') {
        throw new ValidationError('取引のステータスが不正なため、キャンセルを実行できませんでした');
      }
      throw error;
    }
  }
}
