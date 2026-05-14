/**
 * CreateTransactionUseCase（取引申し込みユースケース）
 *
 * 購入希望者が出品に対してマッチングを申し込む処理を担う。
 * 申し込み前に以下のビジネスルールを検証する：
 * - 対象の出品が存在するか
 * - 出品ステータスが 'available'（受付中）か
 * - 出品者本人が自分の出品に申し込もうとしていないか
 */
import { ITransactionRepository } from '../domain/repositories/ITransactionRepository';
import { IItemRepository } from '../domain/repositories/IItemRepository';
import { TransactionEntity } from '../domain/transaction';
import { NotFoundError, ForbiddenError } from '../domain/errors';

export class CreateTransactionUseCase {
  constructor(
    private readonly transactionRepository: ITransactionRepository,
    private readonly itemRepository: IItemRepository,
  ) {}

  /**
   * 取引（マッチング申し込み）を作成して返す。
   * @param itemId - 申し込む出品のID
   * @param buyerId - 申し込む認証ユーザーのID
   * @throws {NotFoundError} 指定した出品が存在しない場合
   * @throws {ForbiddenError} 出品が受付中でない、または出品者本人が申し込もうとした場合
   */
  async execute(itemId: string, buyerId: string): Promise<TransactionEntity> {
    // 出品の存在確認
    const item = await this.itemRepository.findById(itemId);
    if (!item) {
      throw new NotFoundError('指定した出品が見つかりません');
    }

    // 出品ステータスが 'available' でなければ申し込み不可
    if (item.status !== 'available') {
      throw new ForbiddenError('この出品は現在申し込みを受け付けていません');
    }

    // 出品者本人は自分の出品に申し込めない
    if (item.seller_id === buyerId) {
      throw new ForbiddenError('自分の出品には申し込めません');
    }

    // 同じ出品への重複申し込みを防ぐ（キャンセル済みは除外し再申し込みを許可）
    const existing = await this.transactionRepository.findByItemAndBuyer(itemId, buyerId);
    if (existing) {
      throw new ForbiddenError('この出品にはすでに申し込み済みです');
    }

    return await this.transactionRepository.create({
      item_id: itemId,
      seller_id: item.seller_id,
      buyer_id: buyerId,
    });
  }
}
