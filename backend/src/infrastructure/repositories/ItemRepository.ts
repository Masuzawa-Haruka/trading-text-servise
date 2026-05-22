/**
 * ItemRepository（出品リポジトリの実装）
 *
 * IItemRepository インターフェースを実装し、Prisma Client を通じて
 * Supabase（PostgreSQL）の items テーブルへの実際のCRUD操作を担う。
 * この層だけがDBの具体的な実装（Prisma）に依存する。
 */
import { prisma } from '../../lib/prisma';
import { IItemRepository } from '../../domain/repositories/IItemRepository';
import { ItemEntity, CreateItemInput, GetItemsFilter, ItemStatus, ItemCondition, Campus } from '../../domain/item';
import { ItemImageEntity, CreateItemImagesInput } from '../../domain/item_image';
import { Item, ItemImage } from '@prisma/client';

/** Prisma の include で取得する Item + ItemImage のまとめ型 */
type ItemWithImages = Item & { images: ItemImage[] };

export class ItemRepository implements IItemRepository {
  /**
   * 新しい出品をDBに作成する。
   * price / author / description は任意項目のため未指定時はデフォルト値を使う。
   * 画像を同時に保存する通常フローでは createWithImages を使う。
   * このメソッドは画像なし作成やテスト用途の単体作成として残している。
   */
  async create(input: CreateItemInput): Promise<ItemEntity> {
    const item = await prisma.item.create({
      data: {
        seller_id: input.seller_id,
        title: input.title,
        author: input.author ?? null,
        description: input.description ?? null,
        condition: input.condition,
        campus: input.campus,
        handoff_location: input.handoff_location ?? null,
        category: input.category ?? null,
        price: input.price ?? 0,
      },
      include: { images: { orderBy: { display_order: 'asc' } } },
    });
    return this.toEntity(item);
  }

  /**
   * 出品と画像を 1 つの prisma.$transaction で原子的に作成する。
   * 画像作成が失敗した場合は Item 作成ごとロールバックされるため部分成功が発生しない。
   */
  async createWithImages(input: CreateItemInput): Promise<ItemEntity> {
    const { image_urls, ...itemInput } = input;

    return prisma.$transaction(async (tx) => {
      const item = await tx.item.create({
        data: {
          seller_id: itemInput.seller_id,
          title: itemInput.title,
          author: itemInput.author ?? null,
          description: itemInput.description ?? null,
          condition: itemInput.condition,
          campus: itemInput.campus,
          handoff_location: itemInput.handoff_location ?? null,
          category: itemInput.category ?? null,
          price: itemInput.price ?? 0,
        },
      });

      if (image_urls && image_urls.length > 0) {
        await tx.itemImage.createMany({
          data: image_urls.map((url, index) => ({
            item_id: item.id,
            image_url: url,
            display_order: index,
          })),
        });
      }

      const itemWithImages = await tx.item.findUniqueOrThrow({
        where: { id: item.id },
        include: { images: { orderBy: { display_order: 'asc' } } },
      });
      return this.toEntity(itemWithImages);
    });
  }

  /**
   * フィルタ条件（カテゴリ・コンディション・ステータス）に合う出品一覧を取得する。
   * status の指定がない場合は、公開中（available）のみを返す。
   * 並び順は作成日時の降順（新着順）。画像は display_order 昇順で取得する。
   */
  async findAll(filter: GetItemsFilter): Promise<ItemEntity[]> {
    const items = await prisma.item.findMany({
      where: {
        ...(filter.q
          ? {
              OR: [
                { title: { contains: filter.q, mode: 'insensitive' as const } },
                { author: { contains: filter.q, mode: 'insensitive' as const } },
                { description: { contains: filter.q, mode: 'insensitive' as const } },
                { category: { contains: filter.q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
        ...(filter.category ? { category: { contains: filter.category, mode: 'insensitive' as const } } : {}),
        ...(filter.campus ? { campus: filter.campus } : {}),
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
      campus: item.campus.toString() as Campus,
      handoff_location: item.handoff_location,
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
