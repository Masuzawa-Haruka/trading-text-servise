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
import { Item } from '@prisma/client';

export class ItemRepository implements IItemRepository {
  /**
   * 新しい出品をDBに作成する。
   * price と image_url は任意項目のため、未指定の場合はデフォルト値（0 / null）を使う。
   */
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

  /**
   * フィルタ条件（カテゴリ・コンディション・ステータス）に合う出品一覧を取得する。
   * status の指定がない場合は、公開中（available）のみを返す（非公開・完了済みを除外するため）。
   * 並び順は作成日時の降順（新着順）。
   */
  async findAll(filter: GetItemsFilter): Promise<ItemEntity[]> {
    const items = await prisma.item.findMany({
      where: {
        ...(filter.category ? { category: filter.category } : {}),
        ...(filter.condition ? { condition: filter.condition } : {}),
        ...(filter.status ? { status: filter.status } : { status: 'available' }),
      },
      orderBy: { created_at: 'desc' },
    });
    return items.map((item) => this.toEntity(item));
  }

  /**
   * 指定したIDの出品を1件取得する。
   * 存在しない場合は null を返す（存在チェックはUseCase層で行う）。
   */
  async findById(id: string): Promise<ItemEntity | null> {
    const item = await prisma.item.findUnique({ where: { id } });
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
    });
    return this.toEntity(item);
  }

  /**
   * Prismaが返すオブジェクトを、ドメイン層の ItemEntity 型に変換するプライベートメソッド。
   * Prismaの Enum 型は .toString() で文字列に変換する必要がある。
   * 引数に Prisma 生成の Item 型を使うことで、フィールド変更をコンパイル時に検知できる。
   */
  private toEntity(item: Item): ItemEntity {
    return {
      ...item,
      condition: item.condition.toString() as ItemCondition,
      status: item.status.toString() as ItemStatus,
    };
  }
}
