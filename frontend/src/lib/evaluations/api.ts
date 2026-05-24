import { apiFetch } from "@/lib/api/client";
import { MOCK_AUTH_ENABLED } from "@/lib/auth/mock";
import { mockStore } from "@/lib/mockStore";

export type EvaluationType = "good" | "bad" | "cancel" | "no_show";

export type ReceivedEvaluation = {
  id: string;
  transaction_id: string;
  target_user_id: string;
  reviewer_id: string | null;
  score_change: number;
  type: EvaluationType;
  item_title: string | null;
  created_at: string;
  updated_at: string;
};

export async function getMyEvaluations(): Promise<ReceivedEvaluation[]> {
  if (MOCK_AUTH_ENABLED) {
    const now = new Date().toISOString();
    return mockStore.getReceivedEvaluations(mockStore.currentUser.id).map((evaluation) => ({
      id: evaluation.id,
      transaction_id: evaluation.transactionId,
      target_user_id: evaluation.targetUserId,
      reviewer_id: evaluation.reviewerId,
      score_change: evaluation.scoreChange,
      type: evaluation.type,
      item_title: evaluation.itemTitle,
      created_at: evaluation.createdAt,
      updated_at: evaluation.createdAt ?? now,
    }));
  }

  const response = await apiFetch("/api/evaluations/me");
  return parseJsonResponse<ReceivedEvaluation[]>(response, "評価履歴の取得に失敗しました");
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
