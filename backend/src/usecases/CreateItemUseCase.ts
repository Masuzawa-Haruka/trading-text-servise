/**
 * CreateItemUseCase（出品作成ユースケース）
 *
 * 認証済みユーザーが新しい参考書を出品する処理を担う。
 * Item と ItemImage の作成は repository.createWithImages() を通じて1つの
 * トランザクションで原子的に実行されるため、部分成功（Item だけ作成されて
 * 画像が残らない状態）は発生しない。
 * 最大5枚のバリデーションはトランザクション実行前に行う。
 */
import { IItemRepository } from '../domain/repositories/IItemRepository';
import { ItemEntity, CreateItemInput } from '../domain/item';
import { ValidationError } from '../domain/errors';

export class CreateItemUseCase {
  constructor(private readonly itemRepository: IItemRepository) {}

  /**
   * 出品を作成して返す。
   * seller_id はコントローラーが認証情報から取得してセットするため、ここでは受け取るだけ。
   * repository.createWithImages で Item + ItemImage を1トランザクションで一括作成する。
   */
  async execute(input: CreateItemInput): Promise<ItemEntity> {
    // 最大5枚バリデーション（domain/errors.ts の方針に従い ValidationError を使用）
    if (input.image_urls && input.image_urls.length > 5) {
      throw new ValidationError('画像は最大5枚まで登録できます');
    }

    // Item と画像を1つのトランザクションで原子的に作成する
    return this.itemRepository.createWithImages(input);
  }
}
