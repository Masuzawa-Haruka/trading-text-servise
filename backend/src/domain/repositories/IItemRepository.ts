import { ItemEntity, CreateItemInput, GetItemsFilter, ItemStatus } from '../item';

export interface IItemRepository {
  create(input: CreateItemInput): Promise<ItemEntity>;
  findAll(filter: GetItemsFilter): Promise<ItemEntity[]>;
  findById(id: string): Promise<ItemEntity | null>;
  updateStatus(id: string, status: ItemStatus): Promise<ItemEntity>;
}
