import { prisma } from '../../lib/prisma';
import { IItemRepository } from '../../domain/repositories/IItemRepository';
import { ItemEntity, CreateItemInput, GetItemsFilter, ItemStatus, ItemCondition } from '../../domain/item';

export class ItemRepository implements IItemRepository {
  async create(input: CreateItemInput): Promise<ItemEntity> {
    const item = await prisma.item.create({
      data: {
        seller_id: input.seller_id,
        title: input.title,
        description: input.description ?? null,
        condition: input.condition,
        category: input.category ?? null,
        price: input.price ?? 0,
        image_url: input.image_url ?? null,
      },
    });
    return this.toEntity(item);
  }

  async findAll(filter: GetItemsFilter): Promise<ItemEntity[]> {
    const items = await prisma.item.findMany({
      where: {
        ...(filter.category ? { category: filter.category } : {}),
        ...(filter.condition ? { condition: filter.condition } : {}),
        ...(filter.status ? { status: filter.status } : { status: 'available' }),
      },
      orderBy: { created_at: 'desc' },
    });
    return items.map(this.toEntity);
  }

  async findById(id: string): Promise<ItemEntity | null> {
    const item = await prisma.item.findUnique({ where: { id } });
    if (!item) return null;
    return this.toEntity(item);
  }

  async updateStatus(id: string, status: ItemStatus): Promise<ItemEntity> {
    const item = await prisma.item.update({
      where: { id },
      data: { status },
    });
    return this.toEntity(item);
  }

  private toEntity(item: any): ItemEntity {
    return {
      ...item,
      condition: item.condition.toString() as ItemCondition,
      status: item.status.toString() as ItemStatus,
    };
  }
}
