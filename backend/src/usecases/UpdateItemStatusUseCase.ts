/**
 * UpdateItemStatusUseCase（出品ステータス変更ユースケース）
 *
 * 出品者がワンタップで出品のステータスを変更する処理を担う。
 * 仕様書 3.3 の「マッチング中への変更で他ユーザーの新規問い合わせを抑止する」機能に対応。
 *
 * 重要: このユースケースは「本人確認」のビジネスロジックを含む。
 * seller_id と認証ユーザーIDが一致しない場合はエラーを throw し、
 * コントローラーが 403 Forbidden を返す。
 */
import { IItemRepository } from '../domain/repositories/IItemRepository';
import { ItemEntity, ItemStatus } from '../domain/item';

export class UpdateItemStatusUseCase {
  constructor(private readonly itemRepository: IItemRepository) {}

  /**
   * 出品のステータスを変更する。
   * @param id - 変更対象の出品ID
   * @param status - 変更後のステータス
   * @param requesterId - リクエストを送った認証ユーザーのID（本人確認に使用）
   * @throws 'NOT_FOUND' - 指定したIDの出品が存在しない場合
   * @throws 'FORBIDDEN' - リクエスターが出品者本人でない場合
   */
  async execute(id: string, status: ItemStatus, requesterId: string): Promise<ItemEntity> {
    // まず対象の出品が存在するか確認する
    const item = await this.itemRepository.findById(id);

    if (!item) {
      throw new Error('NOT_FOUND');
    }

    // 出品者本人かどうかを確認する（他人の出品ステータスを変更させない）
    if (item.seller_id !== requesterId) {
      throw new Error('FORBIDDEN');
    }

    return await this.itemRepository.updateStatus(id, status);
  }
}
