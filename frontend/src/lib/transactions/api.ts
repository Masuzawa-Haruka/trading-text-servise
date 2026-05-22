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

export type TransactionMessage = {
  id: string;
  transaction_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export type ScheduleCandidate = {
  id: string;
  proposal_id: string;
  proposed_datetime: string;
  proposed_place: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  updated_at: string;
};

export type ScheduleProposal = {
  id: string;
  transaction_id: string;
  sender_id: string;
  status: "pending" | "accepted" | "rejected";
  candidates: ScheduleCandidate[];
  created_at: string;
  updated_at: string;
};

export type SendScheduleProposalPayload = {
  transaction_id: string;
  candidates: {
    proposed_datetime: string;
    proposed_place: string;
  }[];
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

export async function getTransaction(transactionId: string): Promise<Transaction> {
  if (MOCK_AUTH_ENABLED) {
    const transaction = mockStore.getTransaction(transactionId);
    if (!transaction) {
      throw new Error("取引が見つかりません");
    }
    return toApiTransaction(transaction);
  }

  const response = await apiFetch(`/api/transactions/${encodeURIComponent(transactionId)}`);
  return parseJsonResponse<Transaction>(response, "取引詳細の取得に失敗しました");
}

export async function updateTransaction(
  transactionId: string,
  payload: Partial<Pick<Transaction, "status" | "final_price" | "meeting_datetime" | "meeting_place">>,
): Promise<Transaction> {
  if (MOCK_AUTH_ENABLED) {
    return updateMockTransaction(transactionId, payload);
  }

  const response = await apiFetch(`/api/transactions/${encodeURIComponent(transactionId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<Transaction>(response, "取引の更新に失敗しました");
}

export async function getTransactionMessages(transactionId: string): Promise<TransactionMessage[]> {
  if (MOCK_AUTH_ENABLED) {
    return mockStore.getMessages(transactionId).map((message) => ({
      id: message.id,
      transaction_id: message.transactionId,
      sender_id: message.senderId,
      content: message.content,
      created_at: message.createdAt,
      updated_at: message.createdAt,
    }));
  }

  const response = await apiFetch(
    `/api/messages/by-transaction/${encodeURIComponent(transactionId)}`,
  );
  return parseJsonResponse<TransactionMessage[]>(response, "メッセージの取得に失敗しました");
}

export async function sendTransactionMessage(
  transactionId: string,
  content: string,
): Promise<TransactionMessage> {
  if (MOCK_AUTH_ENABLED) {
    const message = mockStore.addMessage(transactionId, content, "text");
    return {
      id: message.id,
      transaction_id: message.transactionId,
      sender_id: message.senderId,
      content: message.content,
      created_at: message.createdAt,
      updated_at: message.createdAt,
    };
  }

  const response = await apiFetch("/api/messages", {
    method: "POST",
    body: JSON.stringify({ transaction_id: transactionId, content }),
  });
  return parseJsonResponse<TransactionMessage>(response, "メッセージの送信に失敗しました");
}

export async function getScheduleProposals(transactionId: string): Promise<ScheduleProposal[]> {
  if (MOCK_AUTH_ENABLED) {
    return [];
  }

  const response = await apiFetch(
    `/api/schedule-proposals/by-transaction/${encodeURIComponent(transactionId)}`,
  );
  return parseJsonResponse<ScheduleProposal[]>(response, "日程提案の取得に失敗しました");
}

export async function sendScheduleProposal(
  payload: SendScheduleProposalPayload,
): Promise<void> {
  if (MOCK_AUTH_ENABLED) {
    const firstCandidate = payload.candidates[0];
    if (firstCandidate) {
      mockStore.addMessage(
        payload.transaction_id,
        `【日程提案】\n${payload.candidates
          .map((candidate, index) => {
            const date = new Date(candidate.proposed_datetime);
            return `候補${index + 1}: ${date.toLocaleString("ja-JP")}\n📍 ${candidate.proposed_place}`;
          })
          .join("\n\n")}`,
        "system",
      );
      mockStore.updateTransactionStatus(payload.transaction_id, "scheduled");
    }
    return;
  }

  const response = await apiFetch("/api/schedule-proposals", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  await parseJsonResponse(response, "日程提案の送信に失敗しました");
}

export async function respondScheduleProposal(
  proposalId: string,
  payload: { status: "accepted" | "rejected"; candidate_id?: string },
): Promise<ScheduleProposal> {
  const response = await apiFetch(`/api/schedule-proposals/${encodeURIComponent(proposalId)}/respond`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<ScheduleProposal>(response, "日程提案への回答に失敗しました");
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

function updateMockTransaction(
  transactionId: string,
  payload: Partial<Pick<Transaction, "status" | "final_price" | "meeting_datetime" | "meeting_place">>,
): Transaction {
  if (payload.status) {
    mockStore.updateTransactionStatus(transactionId, payload.status);
  }
  if (typeof payload.final_price === "number") {
    mockStore.updateTransactionPrice(transactionId, payload.final_price);
  }

  const transaction = mockStore.getTransaction(transactionId);
  if (!transaction) {
    throw new Error("取引が見つかりません");
  }
  return toApiTransaction(transaction, {
    meeting_datetime: payload.meeting_datetime ?? null,
    meeting_place: payload.meeting_place ?? null,
  });
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

function toApiTransaction(
  transaction: MockTransaction,
  override: Partial<Pick<Transaction, "meeting_datetime" | "meeting_place">> = {},
): Transaction {
  const now = new Date().toISOString();
  return {
    id: transaction.id,
    item_id: transaction.itemId,
    seller_id: transaction.sellerId,
    buyer_id: transaction.buyerId,
    final_price: transaction.finalPrice ?? null,
    status: transaction.status,
    meeting_datetime: override.meeting_datetime ?? null,
    meeting_place: override.meeting_place ?? null,
    seller_evaluated: false,
    buyer_evaluated: false,
    created_at: now,
    updated_at: now,
  };
}
