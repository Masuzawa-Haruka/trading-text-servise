import { IItemRepository } from '../domain/repositories/IItemRepository';
import { ItemEntity } from '../domain/item';

export class GetItemDetailsUseCase {
  constructor(private readonly itemRepository: IItemRepository) {}

  async execute(id: string): Promise<ItemEntity | null> {
    return await this.itemRepository.findById(id);
  }
}
