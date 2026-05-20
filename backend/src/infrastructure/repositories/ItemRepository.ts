/**
 * ItemRepository（出品リポジトリの実装）
 *
 * IItemRepository インターフェースを実装し、Prisma Client を通じて
 * Supabase（PostgreSQL）の items テーブルへの実際のCRUD操作を担う。
 * この層だけがDBの具体的な実装（Prisma）に依存する。
 */
import { prisma } from '../../lib/prisma';
import { IItemRepository } from '../../domain/repositories/IItemRepository';
import { ItemEntity, CreateItemInput, GetItemsFilter, ItemStatus, ItemCondition } from '../../domain/item';
import { ItemImageEntity, CreateItemImagesInput } from '../../domain/item_image';
import { Item, ItemImage } from '@prisma/client';

/** Prisma の include で取得する Item + ItemImage のまとめ型 */
type ItemWithImages = Item & { images: ItemImage[] };

export class ItemRepository implements IItemRepository {
  /**
   * 新しい出品をDBに作成する。
   * price / author / description は任意項目のため未指定時はデフォルト値を使う。
   * 画像は UseCase 層で create 後に別途 createImages を呼び出す。
   */
  async create(input: CreateItemInput): Promise<ItemEntity> {
    const item = await prisma.item.create({
      data: {
        seller_id: input.seller_id,
        title: input.title,
        author: input.author ?? null,
        description: input.description ?? null,
        condition: input.condition,
        category: input.category ?? null,
        price: input.price ?? 0,
      },
      include: { images: { orderBy: { display_order: 'asc' } } },
    });
    return this.toEntity(item);
  }

  /**
   * フィルタ条件（カテゴリ・コンディション・ステータス）に合う出品一覧を取得する。
   * status の指定がない場合は、公開中（available）のみを返す。
   * 並び順は作成日時の降順（新着順）。画像は display_order 昇順で取得する。
   */
  async findAll(filter: GetItemsFilter): Promise<ItemEntity[]> {
    const items = await prisma.item.findMany({
      where: {
        ...(filter.category ? { category: filter.category } : {}),
        ...(filter.condition ? { condition: filter.condition } : {}),
        ...(filter.status ? { status: filter.status } : { status: 'available' }),
      },
      include: { images: { orderBy: { display_order: 'asc' } } },
      orderBy: { created_at: 'desc' },
    });
    return items.map((item) => this.toEntity(item));
  }

  /**
   * 指定したIDの出品を1件取得する。画像も display_order 昇順で含む。
   * 存在しない場合は null を返す（存在チェックはUseCase層で行う）。
   */
  async findById(id: string): Promise<ItemEntity | null> {
    const item = await prisma.item.findUnique({
      where: { id },
      include: { images: { orderBy: { display_order: 'asc' } } },
    });
    if (!item) return null;
    return this.toEntity(item);
  }

  /**
   * 指定したIDの出品のステータスを更新する。
   * 呼び出し前に本人確認（seller_id チェック）は UpdateItemStatusUseCase で行われる。
   */
  async updateStatus(id: string, status: ItemStatus): Promise<ItemEntity> {
    const item = await prisma.item.update({
      where: { id },
      data: { status },
      include: { images: { orderBy: { display_order: 'asc' } } },
    });
    return this.toEntity(item);
  }

  /**
   * 出品に紐づく画像を一括作成する。
   * 配列インデックスをそのまま display_order に使う（0がメイン画像）。
   * createManyAndReturn は Prisma 5.14+ の機能のため、createMany + findMany で対応する。
   */
  async createImages(input: CreateItemImagesInput): Promise<ItemImageEntity[]> {
    await prisma.itemImage.createMany({
      data: input.image_urls.map((url, index) => ({
        item_id: input.item_id,
        image_url: url,
        display_order: index,
      })),
    });
    return this.findImagesByItemId(input.item_id);
  }

  /**
   * 指定した出品IDに紐づく画像を display_order 昇順で取得する。
   */
  async findImagesByItemId(item_id: string): Promise<ItemImageEntity[]> {
    const images = await prisma.itemImage.findMany({
      where: { item_id },
      orderBy: { display_order: 'asc' },
    });
    return images.map(this.toImageEntity);
  }

  /**
   * Prismaが返す Item（+ images）をドメイン層の ItemEntity 型に変換する。
   */
  private toEntity(item: ItemWithImages): ItemEntity {
    return {
      id: item.id,
      seller_id: item.seller_id,
      title: item.title,
      author: item.author,
      description: item.description,
      condition: item.condition.toString() as ItemCondition,
      category: item.category,
      price: item.price,
      status: item.status.toString() as ItemStatus,
      images: item.images.map(this.toImageEntity),
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  }

  /**
   * Prismaが返す ItemImage をドメイン層の ItemImageEntity 型に変換する。
   */
  private toImageEntity(image: ItemImage): ItemImageEntity {
    return {
      id: image.id,
      item_id: image.item_id,
      image_url: image.image_url,
      display_order: image.display_order,
      created_at: image.created_at,
    };
  }
}

