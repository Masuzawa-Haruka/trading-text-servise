/**
 * GetItemDetailsUseCase（出品詳細取得ユースケース）
 *
 * 出品IDを受け取り、該当する出品の詳細情報を返す処理を担う。
 * 詳細画面（商品ページ）で使用する。
 */
import { IItemRepository } from '../domain/repositories/IItemRepository';
import { ItemEntity } from '../domain/item';

export class GetItemDetailsUseCase {
  constructor(private readonly itemRepository: IItemRepository) {}

  /**
   * 指定したIDの出品を返す。
   * 存在しない場合は null を返し、コントローラーが 404 レスポンスを返す。
   */
  async execute(id: string): Promise<ItemEntity | null> {
    return await this.itemRepository.findById(id);
  }
}
