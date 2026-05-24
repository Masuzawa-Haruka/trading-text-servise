import { apiFetch } from "@/lib/api/client";
import { MOCK_AUTH_ENABLED } from "@/lib/auth/mock";
import { campusLabel, conditionLabel, type Item } from "@/lib/items/api";
import { mockStore, type MockItem, type MockTransaction } from "@/lib/mockStore";

export type TransactionStatus = "proposing" | "scheduled" | "completed" | "canceled";

export type Transaction = {
  id: string;
  item_id: string;
  item_title: string | null; // 受信箱向けに一覧取得時のみ割り当てられる（詳細取得時は null）
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

export type CancellationRequest = {
  id: string;
  transaction_id: string;
  requester_id: string;
  reason: string | null;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  updated_at: string;
};

export type EvaluationType = "good" | "bad";

export type Evaluation = {
  id: string;
  transaction_id: string;
  target_user_id: string;
  reviewer_id: string | null;
  score_change: number;
  type: EvaluationType | "cancel" | "no_show";
  created_at: string;
  updated_at: string;
};

// ───────────────────────────────────────────
// 通知ヘルパー
// ───────────────────────────────────────────

/**
 * 取引のステータスに応じた受信箱の通知文言を返す。
 * itemTitle が渡されれば「『書名』の取引が〜」となる。
 * null の場合は「取引の取引が〜」とならないよう、展開形の文言にフォールバックする。
 */
export function transactionNotificationText(
  status: TransactionStatus,
  itemTitle: string | null
): string {
  if (itemTitle) {
    switch (status) {
      case "proposing":  return `「${itemTitle}」の取引が開始されました`;
      case "scheduled": return `「${itemTitle}」の日程が決定しました`;
      case "completed": return `「${itemTitle}」の取引が完了しました`;
      case "canceled":  return `「${itemTitle}」の取引がキャンセルされました`;
    }
  }
  // itemTitle 取得失敗時のフォールバック（「取引の取引が」にならない展開形の文言）
  switch (status) {
    case "proposing":  return "取引が開始されました";
    case "scheduled": return "日程が決定しました";
    case "completed": return "取引が完了しました";
    case "canceled":  return "取引がキャンセルされました";
  }
}

/**
 * 取引のステータスが終了（完了 or キャンセル）かどうかを判定する。
 * 受信箱の「既読」表示に使う。
 */
export function isTransactionClosed(status: TransactionStatus): boolean {
  return status === "completed" || status === "canceled";
}

// ───────────────────────────────────────────
// API 関数
// ───────────────────────────────────────────

/**
 * 認証ユーザーが関わる取引一覧を取得する（売り手・買い手どちらも含む）。
 * 本物のAPIは item_title を含むので受信箱での N+1 は発生しない。
 * モック時は mockStore を単一ソースとして取引一覧を返す。
 */
export async function getTransactions(): Promise<Transaction[]> {
  if (MOCK_AUTH_ENABLED) {
    return getMockTransactions();
  }

  const response = await apiFetch("/api/transactions");
  return parseJsonResponse<Transaction[]>(response, "取引一覧の取得に失敗しました");
}

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

export async function executeCancellation(
  transaction: Transaction,
  reason?: string,
): Promise<CancellationRequest> {
  if (MOCK_AUTH_ENABLED) {
    return executeMockCancellation(transaction, reason);
  }

  const response = await apiFetch("/api/cancellations/execute", {
    method: "POST",
    body: JSON.stringify({
      transaction_id: transaction.id,
      ...(reason ? { reason } : {}),
    }),
  });
  return parseJsonResponse<CancellationRequest>(response, "キャンセル実行に失敗しました");
}

export async function submitEvaluation(
  transaction: Transaction,
  type: EvaluationType,
): Promise<Evaluation> {
  if (MOCK_AUTH_ENABLED) {
    return submitMockEvaluation(transaction, type);
  }

  const response = await apiFetch("/api/evaluations", {
    method: "POST",
    body: JSON.stringify({
      transaction_id: transaction.id,
      type,
    }),
  });
  return parseJsonResponse<Evaluation>(response, "評価の送信に失敗しました");
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

// ───────────────────────────────────────────
// モック実装（getTransactions 用）
// ───────────────────────────────────────────

// [1] Mock単一ソース: mockStore.getTransactions() を中心に、toApiTransaction 絵かせて変換
// mock_api_transactions は使わず、getTransaction() / createMockTransactionForItem() と完全に同期する
function getMockTransactions(): Transaction[] {
  const txs = mockStore.getTransactions();
  return txs.map((tx) => {
    // mockStoreのアイテムからタイトルを追加フェッチ（N+1はない: mockStoreはインメモリ）
    const item = mockStore.getItem(tx.itemId);
    return toApiTransaction(tx, {}, item?.title ?? null);
  });
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

function executeMockCancellation(transaction: Transaction, reason?: string): CancellationRequest {
  if (transaction.status === "canceled") {
    throw new Error("この取引はすでにキャンセル済みです");
  }
  if (transaction.status !== "scheduled") {
    throw new Error("キャンセル実行は日時確定後（scheduled）の取引でのみ行えます");
  }

  mockStore.updateTransactionStatus(transaction.id, "canceled");
  mockStore.updateItemStatus(transaction.item_id, "available");
  updateMockApiItemStatus(transaction.item_id, "available");
  mockStore.addMessage(
    transaction.id,
    `【キャンセル】\n${reason ? `理由: ${reason}` : "理由なし"}`,
    "system",
  );

  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    transaction_id: transaction.id,
    requester_id: mockStore.currentUser.id,
    reason: reason ?? null,
    status: "accepted",
    created_at: now,
    updated_at: now,
  };
}

function submitMockEvaluation(transaction: Transaction, type: EvaluationType): Evaluation {
  const updatedTransaction = mockStore.submitEvaluation(transaction.id, mockStore.currentUser.id, type);
  const targetUserId =
    mockStore.currentUser.id === updatedTransaction.sellerId
      ? updatedTransaction.buyerId
      : updatedTransaction.sellerId;

  updateMockApiItemStatus(
    updatedTransaction.itemId,
    updatedTransaction.status === "completed" ? "completed" : "matching",
  );

  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    transaction_id: updatedTransaction.id,
    target_user_id: targetUserId,
    reviewer_id: mockStore.currentUser.id,
    score_change: type === "good" ? 10 : -10,
    type,
    created_at: now,
    updated_at: now,
  };
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
  itemTitle: string | null = null,
): Transaction {
  const now = new Date().toISOString();
  return {
    id: transaction.id,
    item_id: transaction.itemId,
    item_title: itemTitle,
    seller_id: transaction.sellerId,
    buyer_id: transaction.buyerId,
    final_price: transaction.finalPrice ?? null,
    status: transaction.status,
    meeting_datetime: override.meeting_datetime ?? null,
    meeting_place: override.meeting_place ?? null,
    seller_evaluated: transaction.sellerEvaluated ?? false,
    buyer_evaluated: transaction.buyerEvaluated ?? false,
    created_at: now,
    updated_at: now,
  };
}
