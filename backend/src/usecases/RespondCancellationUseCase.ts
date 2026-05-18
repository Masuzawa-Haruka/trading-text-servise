import { ICancellationRepository } from '../domain/repositories/ICancellationRepository';
import { ITransactionRepository } from '../domain/repositories/ITransactionRepository';
import { CancellationRequestEntity, RespondCancellationInput } from '../domain/cancellation';
import { NotFoundError, ForbiddenError, ValidationError } from '../domain/errors';

export class RespondCancellationUseCase {
  constructor(
    private readonly cancellationRepository: ICancellationRepository,
    private readonly transactionRepository: ITransactionRepository
  ) {}

  async execute(input: RespondCancellationInput, responderId: string): Promise<CancellationRequestEntity> {
    const { cancellation_id, action } = input;

    const request = await this.cancellationRepository.findById(cancellation_id);
    if (!request) {
      throw new NotFoundError('キャンセル申請が見つかりません');
    }

    if (request.status !== 'pending') {
      throw new ValidationError('このキャンセル申請は既に回答済みです');
    }

    const transaction = await this.transactionRepository.findById(request.transaction_id);
    if (!transaction) {
      throw new NotFoundError('取引が見つかりません');
    }

    // 1. 権限チェック (申請者以外の当事者のみ回答できる)
    const isSeller = transaction.seller_id === responderId;
    const isBuyer = transaction.buyer_id === responderId;
    if (!isSeller && !isBuyer) {
      throw new ForbiddenError('このキャンセル申請に回答する権限がありません');
    }

    if (request.requester_id === responderId) {
      throw new ForbiddenError('自身が送信したキャンセル申請に回答することはできません');
    }

    if (action === 'reject') {
      return await this.cancellationRepository.rejectCancellationRequest(cancellation_id);
    } else {
      // 承認処理 (原子的なステータス変更 + ペナルティ付与 + 出品戻し)
      try {
        return await this.cancellationRepository.acceptCancellationAtomically(
          cancellation_id,
          transaction.id,
          transaction.item_id,
          request.requester_id, // 申請者 (ペナルティ対象)
          responderId // 回答者 (評価者)
        );
      } catch (error: any) {
        if (error.message === 'INVALID_TRANSITION') {
          throw new ValidationError('取引のステータスが不正なため、キャンセルを完了できませんでした');
        }
        throw error;
      }
    }
  }
}
