import { IItemRepository } from '../domain/repositories/IItemRepository';
import { ItemEntity, ItemStatus } from '../domain/item';

// 出品者本人のみ変更を許可するため、seller_id もチェックする
export class UpdateItemStatusUseCase {
  constructor(private readonly itemRepository: IItemRepository) {}

  async execute(id: string, status: ItemStatus, requesterId: string): Promise<ItemEntity> {
    const item = await this.itemRepository.findById(id);

    if (!item) {
      throw new Error('NOT_FOUND');
    }

    if (item.seller_id !== requesterId) {
      throw new Error('FORBIDDEN');
    }

    return await this.itemRepository.updateStatus(id, status);
  }
}
