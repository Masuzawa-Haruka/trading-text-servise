/**
 * GetItemsUseCase（出品一覧取得ユースケース）
 *
 * ホーム画面や検索画面で使う「出品一覧」を取得する処理を担う。
 * フィルタ条件（カテゴリ・コンディション・ステータス）を受け取り、リポジトリに問い合わせる。
 */
import { IItemRepository } from '../domain/repositories/IItemRepository';
import { ItemEntity, GetItemsFilter } from '../domain/item';

export class GetItemsUseCase {
  constructor(private readonly itemRepository: IItemRepository) {}

  /**
   * フィルタ条件に合う出品一覧を返す。
   * filter を省略した場合はデフォルト値（空のオブジェクト）が使われ、
   * リポジトリ側で status: 'available' が自動適用される。
   */
  async execute(filter: GetItemsFilter = {}): Promise<ItemEntity[]> {
    return await this.itemRepository.findAll(filter);
  }
}
