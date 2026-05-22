/**
 * GetTransactionUseCase
 *
 * 認証ユーザーが当事者として関わる取引を1件取得する。
 */
import { ITransactionRepository } from '../domain/repositories/ITransactionRepository';
import { TransactionEntity } from '../domain/transaction';
import { NotFoundError, ForbiddenError } from '../domain/errors';

export class GetTransactionUseCase {
  constructor(private readonly transactionRepository: ITransactionRepository) {}

  async execute(transactionId: string, requesterId: string): Promise<TransactionEntity> {
    const transaction = await this.transactionRepository.findById(transactionId);
    if (!transaction) {
      throw new NotFoundError('取引が見つかりません');
    }

    const isParticipant =
      transaction.seller_id === requesterId || transaction.buyer_id === requesterId;
    if (!isParticipant) {
      throw new ForbiddenError('この取引を閲覧する権限がありません');
    }

    return transaction;
  }
}
