/**
 * UpdateTransactionUseCase（取引更新ユースケース）
 *
 * 取引のステータス・受け渡し情報・確定価格を更新する処理を担う。
 * 更新は取引の当事者（売り手または買い手）のみが実行できる。
 *
 * ステータス遷移はステートマシン（VALID_TRANSITIONS）で管理し、不正な遷移を防ぐ。
 * 対応操作例：
 * - 出品者が申し込みを承認 → proposing → scheduled
 * - 受け渡し完了 → scheduled → completed
 * - いずれかがキャンセル → proposing/scheduled → canceled
 */
import { ITransactionRepository } from '../domain/repositories/ITransactionRepository';
import { TransactionEntity, UpdateTransactionInput, VALID_TRANSITIONS } from '../domain/transaction';
import { NotFoundError, ForbiddenError } from '../domain/errors';

export class UpdateTransactionUseCase {
  constructor(private readonly transactionRepository: ITransactionRepository) {}

  /**
   * 取引情報を更新して返す。
   * @param id - 更新対象の取引ID
   * @param input - 更新するフィールド（未指定のフィールドは変更しない）
   * @param requesterId - リクエストした認証ユーザーのID（当事者確認に使用）
   * @throws {NotFoundError} 指定した取引が存在しない場合
   * @throws {ForbiddenError} 当事者でない、または無効なステータス遷移の場合
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

    // ステータス変更が要求された場合、遷移の妥当性をステートマシンで検証する
    // 例: completed/canceled（終端状態）からの遷移や proposing → completed の飛び越しを禁止する
    if (input.status !== undefined) {
      const allowedNext = VALID_TRANSITIONS[transaction.status];
      if (!allowedNext.includes(input.status)) {
        throw new ForbiddenError(
          `${transaction.status} から ${input.status} への遷移は許可されていません`,
        );
      }
    }

    return await this.transactionRepository.update(id, input);
  }
}
