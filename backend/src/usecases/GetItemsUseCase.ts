import { IItemRepository } from '../domain/repositories/IItemRepository';
import { ItemEntity, GetItemsFilter } from '../domain/item';

export class GetItemsUseCase {
  constructor(private readonly itemRepository: IItemRepository) {}

  async execute(filter: GetItemsFilter = {}): Promise<ItemEntity[]> {
    return await this.itemRepository.findAll(filter);
  }
}
