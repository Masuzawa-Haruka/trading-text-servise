/**
 * CreateItemUseCase（出品作成ユースケース）
 *
 * 認証済みユーザーが新しい参考書を出品する処理を担う。
 * リポジトリに出品データの保存を依頼し、作成された出品エンティティを返す。
 */
import { IItemRepository } from '../domain/repositories/IItemRepository';
import { ItemEntity, CreateItemInput } from '../domain/item';

export class CreateItemUseCase {
  constructor(private readonly itemRepository: IItemRepository) {}

  /**
   * 出品を作成して返す。
   * seller_id はコントローラーが認証情報から取得してセットするため、ここでは受け取るだけ。
   */
  async execute(input: CreateItemInput): Promise<ItemEntity> {
    return await this.itemRepository.create(input);
  }
}
