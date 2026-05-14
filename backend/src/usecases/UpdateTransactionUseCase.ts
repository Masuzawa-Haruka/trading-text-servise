/**
 * UpdateTransactionUseCase（取引更新ユースケース）
 *
 * 取引のステータス・受け渡し情報・確定価格を更新する処理を担う。
 * 更新は取引の当事者（売り手または買い手）のみが実行できる。
 *
 * 対応操作例：
 * - 売り手が申し込みを承認 → status: 'scheduled'
 * - 売り手/買い手が受け渡し情報を設定 → meeting_datetime / meeting_place
 * - 双方が受け渡し完了を確認 → status: 'completed'
 * - いずれかがキャンセル → status: 'canceled'
 */
import { ITransactionRepository } from '../domain/repositories/ITransactionRepository';
import { TransactionEntity, UpdateTransactionInput } from '../domain/transaction';
import { NotFoundError, ForbiddenError } from '../domain/errors';

export class UpdateTransactionUseCase {
  constructor(private readonly transactionRepository: ITransactionRepository) {}

  /**
   * 取引情報を更新して返す。
   * @param id - 更新対象の取引ID
   * @param input - 更新するフィールド（未指定のフィールドは変更しない）
   * @param requesterId - リクエストした認証ユーザーのID（当事者確認に使用）
   * @throws {NotFoundError} 指定した取引が存在しない場合
   * @throws {ForbiddenError} リクエスターが取引の当事者でない場合
   */
  async execute(
    id: string,
    input: UpdateTransactionInput,
    requesterId: string,
  ): Promise<TransactionEntity> {
    // 取引の存在確認
    const transaction = await this.transactionRepository.findById(id);
    if (!transaction) {
      throw new NotFoundError('指定した取引が見つかりません');
    }

    // 取引の当事者（売り手または買い手）のみ更新可能
    const isParticipant =
      transaction.seller_id === requesterId || transaction.buyer_id === requesterId;
    if (!isParticipant) {
      throw new ForbiddenError('この取引を更新する権限がありません');
    }

    return await this.transactionRepository.update(id, input);
  }
}
