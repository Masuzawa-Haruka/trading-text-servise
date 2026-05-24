import { apiFetch } from "@/lib/api/client";
import { MOCK_AUTH_ENABLED } from "@/lib/auth/mock";
import { mockStore } from "@/lib/mockStore";
import type { Transaction } from "@/lib/transactions/api";

const MOCK_PRICE_OFFERS_STORAGE_KEY = "mock_price_offers";

export type PriceOfferStatus = "pending" | "accepted" | "rejected";

export type PriceOffer = {
  id: string;
  transaction_id: string;
  sender_id: string;
  price: number;
  status: PriceOfferStatus;
  offer_count: number;
  created_at: string;
  updated_at: string;
};

export async function getPriceOffers(transactionId: string): Promise<PriceOffer[]> {
  if (MOCK_AUTH_ENABLED) {
    return readMockOffers().filter((offer) => offer.transaction_id === transactionId);
  }

  const response = await apiFetch(`/api/price-offers/by-transaction/${encodeURIComponent(transactionId)}`);
  return parseJsonResponse<PriceOffer[]>(response, "価格交渉履歴の取得に失敗しました");
}

export async function sendPriceOffer(transaction: Transaction, price: number): Promise<PriceOffer> {
  if (MOCK_AUTH_ENABLED) {
    return sendMockPriceOffer(transaction, price);
  }

  const response = await apiFetch("/api/price-offers", {
    method: "POST",
    body: JSON.stringify({
      transaction_id: transaction.id,
      price,
    }),
  });
  return parseJsonResponse<PriceOffer>(response, "価格提案の送信に失敗しました");
}

export async function respondPriceOffer(
  transaction: Transaction,
  offerId: string,
  status: "accepted" | "rejected",
): Promise<PriceOffer> {
  if (MOCK_AUTH_ENABLED) {
    return respondMockPriceOffer(transaction, offerId, status);
  }

  const response = await apiFetch(`/api/price-offers/${encodeURIComponent(offerId)}/respond`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return parseJsonResponse<PriceOffer>(response, "価格提案への回答に失敗しました");
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

function sendMockPriceOffer(transaction: Transaction, price: number): PriceOffer {
  if (transaction.status !== "proposing") {
    throw new Error("現在の取引ステータスでは価格交渉を行えません");
  }
  if (!Number.isInteger(price) || price < 0) {
    throw new Error("価格は0以上の整数で入力してください");
  }

  const offers = readMockOffers();
  const transactionOffers = offers.filter((offer) => offer.transaction_id === transaction.id);
  if (transactionOffers.some((offer) => offer.status === "pending")) {
    throw new Error("未回答の価格提案があります");
  }
  if (transactionOffers.length >= 3) {
    throw new Error("この取引での価格交渉回数の上限（3回）に達しました");
  }

  const now = new Date().toISOString();
  const offer: PriceOffer = {
    id: crypto.randomUUID(),
    transaction_id: transaction.id,
    sender_id: mockStore.currentUser.id,
    price,
    status: "pending",
    offer_count: transactionOffers.length + 1,
    created_at: now,
    updated_at: now,
  };

  writeMockOffers([...offers, offer]);
  mockStore.addMessage(transaction.id, `【価格提案】${formatPrice(price)}で提案しました`, "system");
  return offer;
}

function respondMockPriceOffer(
  transaction: Transaction,
  offerId: string,
  status: "accepted" | "rejected",
): PriceOffer {
  const offers = readMockOffers();
  const offer = offers.find((item) => item.id === offerId && item.transaction_id === transaction.id);
  if (!offer) {
    throw new Error("価格提案が見つかりません");
  }
  if (offer.sender_id === mockStore.currentUser.id) {
    throw new Error("自分が送信した価格提案には回答できません");
  }
  if (offer.status !== "pending") {
    throw new Error("この価格提案は既に回答済みです");
  }

  const now = new Date().toISOString();
  const updatedOffer = { ...offer, status, updated_at: now };
  writeMockOffers(offers.map((item) => (item.id === offerId ? updatedOffer : item)));

  if (status === "accepted") {
    mockStore.updateTransactionPrice(transaction.id, offer.price);
    mockStore.addMessage(transaction.id, `【価格確定】${formatPrice(offer.price)}で合意しました`, "system");
  } else {
    mockStore.addMessage(transaction.id, `【価格提案】${formatPrice(offer.price)}の提案を見送りました`, "system");
  }

  return updatedOffer;
}

function readMockOffers(): PriceOffer[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(MOCK_PRICE_OFFERS_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isPriceOffer) : [];
  } catch {
    return [];
  }
}

function writeMockOffers(offers: PriceOffer[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MOCK_PRICE_OFFERS_STORAGE_KEY, JSON.stringify(offers));
}

function isPriceOffer(value: unknown): value is PriceOffer {
  if (!value || typeof value !== "object") return false;
  const offer = value as Record<string, unknown>;
  return (
    typeof offer.id === "string" &&
    typeof offer.transaction_id === "string" &&
    typeof offer.sender_id === "string" &&
    typeof offer.price === "number" &&
    (offer.status === "pending" || offer.status === "accepted" || offer.status === "rejected") &&
    typeof offer.offer_count === "number" &&
    typeof offer.created_at === "string" &&
    typeof offer.updated_at === "string"
  );
}

function formatPrice(price: number): string {
  return price === 0 ? "0円" : `${price.toLocaleString("ja-JP")}円`;
}
