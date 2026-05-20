/**
 * CreateItemUseCase（出品作成ユースケース）
 *
 * 認証済みユーザーが新しい参考書を出品する処理を担う。
 * Item レコードを作成した後、image_urls が指定されていれば ItemImage を一括作成する。
 * 最大5枚のバリデーションもここで行う。
 */
import { IItemRepository } from '../domain/repositories/IItemRepository';
import { ItemEntity, CreateItemInput } from '../domain/item';
import { ValidationError } from '../domain/errors';

export class CreateItemUseCase {
  constructor(private readonly itemRepository: IItemRepository) {}

  /**
   * 出品を作成して返す。
   * seller_id はコントローラーが認証情報から取得してセットするため、ここでは受け取るだけ。
   * image_urls が指定された場合は Item 作成後に ItemImage を一括作成し、
   * 最終的に images が埋まった ItemEntity を返す。
   */
  async execute(input: CreateItemInput): Promise<ItemEntity> {
    const { image_urls, ...itemInput } = input;

    // 最大5枚バリデーション（domain/errors.ts の方針に従い ValidationError を使用）
    if (image_urls && image_urls.length > 5) {
      throw new ValidationError('画像は最大5枚まで登録できます');
    }

    // Item レコードを作成（この時点で images は空配列）
    const item = await this.itemRepository.create(itemInput);

    // 画像URLがあれば一括作成して Entity に反映
    if (image_urls && image_urls.length > 0) {
      const images = await this.itemRepository.createImages({
        item_id: item.id,
        image_urls,
      });
      return { ...item, images };
    }

    return item;
  }
}

