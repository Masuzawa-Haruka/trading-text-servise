/**
 * UpdateTransactionUseCase（取引更新ユースケース）
 *
 * 取引のステータス・受け渡し情報・確定価格を更新する処理を担う。
 * 以下のビジネスルールをすべて検証する：
 *
 * 1. 当事者確認: 売り手または買い手のみ更新可能
 * 2. ステートマシン: VALID_TRANSITIONS で許可された遷移のみ実行可能
 * 3. ロール制御: TRANSITION_ALLOWED_ROLES で遷移ごとに実行可能なロールを制限
 *    - proposing → scheduled は出品者のみ（承認操作）
 *    - キャンセル・完了は双方可能
 * 4. scheduled 前提条件: meeting_datetime と meeting_place が必須
 * 5. 出品ステータス同期: completed/canceled 時に出品ステータスも原子的に更新
 */
import { ITransactionRepository } from '../domain/repositories/ITransactionRepository';
import {
  TransactionEntity,
  UpdateTransactionInput,
  VALID_TRANSITIONS,
  TRANSITION_ALLOWED_ROLES,
} from '../domain/transaction';
import { NotFoundError, ForbiddenError } from '../domain/errors';

export class UpdateTransactionUseCase {
  constructor(private readonly transactionRepository: ITransactionRepository) {}

  /**
   * 取引情報を更新して返す。
   * @param id - 更新対象の取引ID
   * @param input - 更新するフィールド（未指定のフィールドは変更しない）
   * @param requesterId - リクエストした認証ユーザーのID（当事者・ロール確認に使用）
   * @throws {NotFoundError} 指定した取引が存在しない場合
   * @throws {ForbiddenError} 権限なし、無効な遷移、scheduled の前提条件不足の場合
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
    const isSeller = transaction.seller_id === requesterId;
    const isBuyer = transaction.buyer_id === requesterId;
    if (!isSeller && !isBuyer) {
      throw new ForbiddenError('この取引を更新する権限がありません');
    }

    // ステータス変更が要求された場合の各種検証
    if (input.status !== undefined) {
      // ステートマシン検証: 許可された遷移かどうかを確認
      const allowedNext = VALID_TRANSITIONS[transaction.status];
      if (!allowedNext.includes(input.status)) {
        throw new ForbiddenError(
          `${transaction.status} から ${input.status} への遷移は許可されていません`,
        );
      }

      // ロール制御: この遷移を実行できるのは売り手か買い手かを確認
      const transitionKey = `${transaction.status}->${input.status}`;
      const allowedRole = TRANSITION_ALLOWED_ROLES[transitionKey];
      if (allowedRole === 'seller' && !isSeller) {
        throw new ForbiddenError('この操作は出品者のみ実行できます');
      }
      if (allowedRole === 'buyer' && !isBuyer) {
        throw new ForbiddenError('この操作は購入希望者のみ実行できます');
      }

      // scheduled 前提条件: 受け渡し日時と場所が確定していなければ遷移不可
      // リクエストで指定されたものがなければ、既存の値をフォールバックとして確認する
      if (input.status === 'scheduled') {
        const meetingDatetime = input.meeting_datetime ?? transaction.meeting_datetime;
        const meetingPlace = input.meeting_place ?? transaction.meeting_place;
        if (meetingDatetime == null || meetingPlace == null) {
          throw new ForbiddenError(
            'scheduled へ遷移するには meeting_datetime と meeting_place の指定が必要です',
          );
        }
      }

      // 出品ステータスの同期が必要な遷移では原子的に更新する
      // completed → 出品を completed に（取引完了）
      // canceled → 出品を available に戻す（再募集可能に）
      if (input.status === 'completed' || input.status === 'canceled') {
        const itemStatus = input.status === 'completed' ? 'completed' as const : 'available' as const;
        return await this.transactionRepository.updateWithItemSync(
          id,
          input,
          { itemId: transaction.item_id, status: itemStatus },
        );
      }
    }

    // 出品同期が不要な場合は通常の update を使う
    return await this.transactionRepository.update(id, input);
  }
}
