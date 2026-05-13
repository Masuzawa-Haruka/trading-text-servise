export type ItemStatus = 'available' | 'matching' | 'completed' | 'canceled';
export type ItemCondition = 'new' | 'used_good' | 'used_bad';

export interface ItemEntity {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  condition: ItemCondition;
  category: string | null;
  price: number;
  image_url: string | null;
  status: ItemStatus;
  created_at: Date;
  updated_at: Date;
}

export interface CreateItemInput {
  seller_id: string;
  title: string;
  description?: string;
  condition: ItemCondition;
  category?: string;
  price?: number;
  image_url?: string;
}

export interface GetItemsFilter {
  category?: string;
  condition?: ItemCondition;
  status?: ItemStatus;
}
