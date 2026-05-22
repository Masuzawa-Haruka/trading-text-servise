import { apiFetch } from "@/lib/api/client";
import { MOCK_AUTH_ENABLED } from "@/lib/auth/mock";
import { campusLabel, conditionLabel, type Item } from "@/lib/items/api";
import { mockStore, type MockItem, type MockTransaction } from "@/lib/mockStore";

export type TransactionStatus = "proposing" | "scheduled" | "completed" | "canceled";

export type Transaction = {
  id: string;
  item_id: string;
  seller_id: string;
  buyer_id: string;
  final_price: number | null;
  status: TransactionStatus;
  meeting_datetime: string | null;
  meeting_place: string | null;
  seller_evaluated: boolean;
  buyer_evaluated: boolean;
  created_at: string;
  updated_at: string;
};

export async function createTransactionForItem(item: Item): Promise<Transaction> {
  if (MOCK_AUTH_ENABLED) {
    return createMockTransactionForItem(item);
  }

  const response = await apiFetch("/api/transactions", {
    method: "POST",
    body: JSON.stringify({ item_id: item.id }),
  });

  return parseJsonResponse<Transaction>(response, "取引開始に失敗しました");
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

function createMockTransactionForItem(item: Item): Transaction {
  ensureMockStoreItem(item);
  const transaction = mockStore.createTransaction(item.id, item.seller_id);
  updateMockApiItemStatus(item.id, "matching");
  return toApiTransaction(transaction);
}

function ensureMockStoreItem(item: Item): void {
  if (typeof window === "undefined") return;

  const raw = window.localStorage.getItem("mock_items");
  const existingItems = raw ? (JSON.parse(raw) as MockItem[]) : [];
  if (existingItems.some((mockItem) => mockItem.id === item.id)) {
    return;
  }

  const mockItem: MockItem = {
    id: item.id,
    title: item.title,
    author: item.author ?? "不明",
    condition: conditionLabel(item.condition),
    campus: campusLabel(item.campus),
    price: item.price,
    free: item.price === 0,
    status: item.status,
    sellerId: item.seller_id,
    likes: 0,
  };

  window.localStorage.setItem("mock_items", JSON.stringify([mockItem, ...existingItems]));
}

function updateMockApiItemStatus(itemId: string, status: Item["status"]): void {
  if (typeof window === "undefined") return;

  const raw = window.localStorage.getItem("mock_api_items");
  if (!raw) return;

  try {
    const items = JSON.parse(raw) as Item[];
    window.localStorage.setItem(
      "mock_api_items",
      JSON.stringify(items.map((item) => (item.id === itemId ? { ...item, status } : item))),
    );
  } catch {
    // Ignore invalid local mock data; the UI can still continue through mockStore.
  }
}

function toApiTransaction(transaction: MockTransaction): Transaction {
  const now = new Date().toISOString();
  return {
    id: transaction.id,
    item_id: transaction.itemId,
    seller_id: transaction.sellerId,
    buyer_id: transaction.buyerId,
    final_price: transaction.finalPrice ?? null,
    status: transaction.status,
    meeting_datetime: null,
    meeting_place: null,
    seller_evaluated: false,
    buyer_evaluated: false,
    created_at: now,
    updated_at: now,
  };
}
