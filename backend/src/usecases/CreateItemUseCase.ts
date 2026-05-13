import { IItemRepository } from '../domain/repositories/IItemRepository';
import { ItemEntity, CreateItemInput } from '../domain/item';

export class CreateItemUseCase {
  constructor(private readonly itemRepository: IItemRepository) {}

  async execute(input: CreateItemInput): Promise<ItemEntity> {
    return await this.itemRepository.create(input);
  }
}
