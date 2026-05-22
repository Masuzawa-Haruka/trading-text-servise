import { apiFetch } from "@/lib/api/client";
import { MOCK_AUTH_ENABLED, MOCK_USER_ID } from "@/lib/auth/mock";
import { createClient } from "@/lib/supabase/client";

export const ITEM_IMAGE_BUCKET = "item-images";
const MOCK_ITEMS_STORAGE_KEY = "mock_api_items";

export type ItemCondition = "new" | "used_good" | "used_bad";
export type Campus = "toyonaka" | "suita" | "minoh";
export type ItemStatus = "available" | "matching" | "completed" | "canceled";

export type ItemImage = {
  id: string;
  item_id: string;
  image_url: string;
  display_order: number;
  created_at: string;
};

export type Item = {
  id: string;
  seller_id: string;
  title: string;
  author: string | null;
  description: string | null;
  condition: ItemCondition;
  campus: Campus;
  handoff_location: string | null;
  category: string | null;
  price: number;
  status: ItemStatus;
  images: ItemImage[];
  created_at: string;
  updated_at: string;
};

export type GetItemsParams = {
  q?: string;
  campus?: Campus;
  category?: string;
  condition?: ItemCondition;
  status?: ItemStatus;
};

export type CreateItemPayload = {
  title: string;
  author?: string;
  description?: string;
  condition: ItemCondition;
  campus: Campus;
  handoff_location: string;
  category?: string;
  price: number;
  image_urls?: string[];
};

export async function getItems(params: GetItemsParams = {}): Promise<Item[]> {
  if (MOCK_AUTH_ENABLED) {
    return getMockItems(params);
  }

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  const response = await apiFetch(`/api/items${query ? `?${query}` : ""}`, {
    requireAuth: false,
  });

  return parseJsonResponse<Item[]>(response, "出品一覧の取得に失敗しました");
}

export async function getItem(id: string): Promise<Item> {
  if (MOCK_AUTH_ENABLED) {
    const item = getMockItems({ status: undefined }).find((mockItem) => mockItem.id === id);
    if (!item) {
      throw new Error("出品が見つかりません");
    }
    return item;
  }

  const response = await apiFetch(`/api/items/${encodeURIComponent(id)}`, {
    requireAuth: false,
  });

  return parseJsonResponse<Item>(response, "出品詳細の取得に失敗しました");
}

export async function createItem(payload: CreateItemPayload): Promise<Item> {
  if (MOCK_AUTH_ENABLED) {
    return createMockItem(payload);
  }

  const response = await apiFetch("/api/items", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return parseJsonResponse<Item>(response, "出品に失敗しました");
}

export async function uploadItemImages(files: File[]): Promise<string[]> {
  if (files.length === 0) {
    return [];
  }

  if (MOCK_AUTH_ENABLED) {
    return Promise.all(files.map(fileToDataUrl));
  }

  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("画像アップロードにはログインが必要です");
  }

  const uploadedUrls: string[] = [];

  for (const [index, file] of files.entries()) {
    const extension = getFileExtension(file.name);
    const objectPath = `${user.id}/${Date.now()}-${index}-${crypto.randomUUID()}${extension}`;
    const { error } = await supabase.storage.from(ITEM_IMAGE_BUCKET).upload(objectPath, file, {
      cacheControl: "3600",
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    if (error) {
      throw new Error(`画像アップロードに失敗しました: ${error.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(ITEM_IMAGE_BUCKET).getPublicUrl(objectPath);
    uploadedUrls.push(publicUrl);
  }

  return uploadedUrls;
}

export function conditionLabel(condition: ItemCondition): string {
  switch (condition) {
    case "new":
      return "新品・未使用";
    case "used_good":
      return "目立った傷や汚れなし";
    case "used_bad":
      return "傷や汚れあり";
  }
}

export function campusLabel(campus: Campus): string {
  switch (campus) {
    case "toyonaka":
      return "豊中キャンパス";
    case "suita":
      return "吹田キャンパス";
    case "minoh":
      return "箕面キャンパス";
  }
}

async function parseJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : fallbackMessage;
    throw new Error(message);
  }

  return data as T;
}

function getFileExtension(fileName: string): string {
  const match = fileName.match(/\.[a-zA-Z0-9]+$/);
  return match ? match[0].toLowerCase() : "";
}

function getMockItems(params: GetItemsParams): Item[] {
  const items = readMockItems();
  const normalizedQuery = params.q?.trim().toLowerCase();
  const status = params.status ?? "available";

  return items.filter((item) => {
    if (status && item.status !== status) return false;
    if (params.campus && item.campus !== params.campus) return false;
    if (params.condition && item.condition !== params.condition) return false;
    if (params.category && !item.category?.includes(params.category)) return false;
    if (!normalizedQuery) return true;

    return [item.title, item.author, item.description, item.category]
      .filter((value): value is string => typeof value === "string")
      .some((value) => value.toLowerCase().includes(normalizedQuery));
  });
}

function createMockItem(payload: CreateItemPayload): Item {
  const now = new Date().toISOString();
  const itemId = crypto.randomUUID();
  const item: Item = {
    id: itemId,
    seller_id: MOCK_USER_ID,
    title: payload.title,
    author: payload.author ?? null,
    description: payload.description ?? null,
    condition: payload.condition,
    campus: payload.campus,
    handoff_location: payload.handoff_location,
    category: payload.category ?? null,
    price: payload.price,
    status: "available",
    images: (payload.image_urls ?? []).map((url, index) => ({
      id: crypto.randomUUID(),
      item_id: itemId,
      image_url: url,
      display_order: index,
      created_at: now,
    })),
    created_at: now,
    updated_at: now,
  };

  const items = readMockItems();
  writeMockItems([item, ...items]);
  return item;
}

function readMockItems(): Item[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(MOCK_ITEMS_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeMockItems(items: Item[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(MOCK_ITEMS_STORAGE_KEY, JSON.stringify(items));
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("画像の読み込みに失敗しました"));
    });
    reader.addEventListener("error", () => reject(new Error("画像の読み込みに失敗しました")));
    reader.readAsDataURL(file);
  });
}
