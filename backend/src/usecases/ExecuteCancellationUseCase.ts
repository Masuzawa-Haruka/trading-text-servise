/**
 * ExecuteCancellationUseCase（キャンセル即時実行ユースケース）
 *
 * POST /api/cancellations/execute に対応するユースケース。
 * 旧 RequestCancellationUseCase / RespondCancellationUseCase は廃止。
 *
 * 前提:
 *   - 取引当事者（出品者または受取者）のみ実行可能
 *   - 取引ステータスが scheduled の場合のみ実行可能（その他は 409）
 *   - 同一取引への重複実行は 409 で弾く
 *
 * 副作用（すべて 1 トランザクション）:
 *   - Transaction.status → canceled
 *   - Item.status → available
 *   - cancellation_requests に実行履歴を記録（status='accepted'）
 *   - Evaluation（cancel, -10）作成
 *   - 実行者の credit_score -= 10
 */
import { ICancellationRepository } from '../domain/repositories/ICancellationRepository';
import { ITransactionRepository } from '../domain/repositories/ITransactionRepository';
import { CancellationRequestEntity, ExecuteCancellationInput } from '../domain/cancellation';
import { NotFoundError, ForbiddenError, ConflictError } from '../domain/errors';

export class ExecuteCancellationUseCase {
  constructor(
    private readonly cancellationRepository: ICancellationRepository,
    private readonly transactionRepository: ITransactionRepository
  ) {}

  async execute(input: ExecuteCancellationInput, requesterId: string): Promise<CancellationRequestEntity> {
    const { transaction_id, reason } = input;

    // 1. 取引の存在確認
    const transaction = await this.transactionRepository.findById(transaction_id);
    if (!transaction) {
      throw new NotFoundError('取引が見つかりません');
    }

    // 2. 権限チェック（当事者のみ）
    const isSeller = transaction.seller_id === requesterId;
    const isBuyer = transaction.buyer_id === requesterId;
    if (!isSeller && !isBuyer) {
      throw new ForbiddenError('この取引のキャンセルを実行する権限がありません');
    }

    // 3. 取引ステータスチェック（scheduled のみ許可）
    //    入力不正ではなくリソース状態の競合なので ConflictError (409) を使う
    if (transaction.status === 'canceled') {
      throw new ConflictError('この取引はすでにキャンセル済みです');
    }
    if (transaction.status !== 'scheduled') {
      throw new ConflictError('キャンセル実行は日時確定後（scheduled）の取引でのみ行えます');
    }

    try {
      return await this.cancellationRepository.executeCancellationAtomically(
        transaction_id,
        transaction.item_id,
        requesterId,
        reason
      );
    } catch (error: any) {
      if (error.message === 'ALREADY_CANCELED') {
        throw new ConflictError('この取引はすでにキャンセル済みです');
      }
      if (error.message === 'INVALID_TRANSITION') {
        throw new ConflictError('キャンセル実行は日時確定後（scheduled）の取引でのみ行えます');
      }
      throw error;
    }
  }
}
