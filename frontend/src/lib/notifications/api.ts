import { apiFetch } from "@/lib/api/client";
import { MOCK_AUTH_ENABLED, MOCK_USER_ID } from "@/lib/auth/mock";

const MOCK_NOTIFICATIONS_STORAGE_KEY = "mock_api_notifications";
export const NOTIFICATIONS_UPDATED_EVENT = "notifications:updated";

export type NotificationType = "action_required" | "info";

export type AppNotification = {
  id: string;
  user_id: string;
  actor_id: string | null;
  title: string;
  type: NotificationType;
  transaction_id: string | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
};

export type UnreadNotificationCount = {
  unread_count: number;
};

export async function getNotifications(): Promise<AppNotification[]> {
  if (MOCK_AUTH_ENABLED) {
    return readMockNotifications();
  }

  const response = await apiFetch("/api/notifications");
  return parseJsonResponse<AppNotification[]>(response, "通知一覧の取得に失敗しました");
}

export async function getUnreadNotificationCount(): Promise<number> {
  if (MOCK_AUTH_ENABLED) {
    return readMockNotifications().filter((notification) => !notification.is_read).length;
  }

  const response = await apiFetch("/api/notifications/unread-count");
  const data = await parseJsonResponse<UnreadNotificationCount>(
    response,
    "未読通知数の取得に失敗しました",
  );
  return data.unread_count;
}

export async function markNotificationRead(notificationId: string): Promise<AppNotification> {
  if (MOCK_AUTH_ENABLED) {
    const notifications = readMockNotifications();
    const notification = notifications.find((item) => item.id === notificationId);
    if (!notification) {
      throw new Error("通知が見つかりません");
    }

    const updated = {
      ...notification,
      is_read: true,
      updated_at: new Date().toISOString(),
    };
    writeMockNotifications(
      notifications.map((item) => (item.id === notificationId ? updated : item)),
    );
    notifyNotificationsUpdated();
    return updated;
  }

  const response = await apiFetch(`/api/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: "PATCH",
  });
  const notification = await parseJsonResponse<AppNotification>(
    response,
    "通知の既読化に失敗しました",
  );
  notifyNotificationsUpdated();
  return notification;
}

export function notificationHref(notification: Pick<AppNotification, "transaction_id">): string {
  return notification.transaction_id
    ? `/transactions/${encodeURIComponent(notification.transaction_id)}`
    : "/inbox";
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

function readMockNotifications(): AppNotification[] {
  if (typeof window === "undefined") {
    return defaultMockNotifications();
  }

  const raw = window.localStorage.getItem(MOCK_NOTIFICATIONS_STORAGE_KEY);
  if (!raw) {
    const notifications = defaultMockNotifications();
    writeMockNotifications(notifications);
    return notifications;
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isAppNotification) : defaultMockNotifications();
  } catch {
    return defaultMockNotifications();
  }
}

function writeMockNotifications(notifications: AppNotification[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MOCK_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
}

function notifyNotificationsUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
}

function defaultMockNotifications(): AppNotification[] {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();

  return [
    {
      id: "11111111-1111-4111-8111-111111111101",
      user_id: MOCK_USER_ID,
      actor_id: "22222222-2222-4222-8222-222222222222",
      title: "日程提案が届いています",
      type: "action_required",
      transaction_id: null,
      is_read: false,
      created_at: oneHourAgo,
      updated_at: oneHourAgo,
    },
    {
      id: "11111111-1111-4111-8111-111111111102",
      user_id: MOCK_USER_ID,
      actor_id: "22222222-2222-4222-8222-222222222222",
      title: "取引メッセージが届きました",
      type: "info",
      transaction_id: null,
      is_read: false,
      created_at: yesterday,
      updated_at: yesterday,
    },
    {
      id: "11111111-1111-4111-8111-111111111103",
      user_id: MOCK_USER_ID,
      actor_id: null,
      title: "評価が完了しました",
      type: "info",
      transaction_id: null,
      is_read: true,
      created_at: twoDaysAgo,
      updated_at: twoDaysAgo,
    },
  ];
}

function isAppNotification(value: unknown): value is AppNotification {
  if (!value || typeof value !== "object") return false;
  const notification = value as Record<string, unknown>;
  return (
    typeof notification.id === "string" &&
    typeof notification.user_id === "string" &&
    (typeof notification.actor_id === "string" || notification.actor_id === null) &&
    typeof notification.title === "string" &&
    (notification.type === "action_required" || notification.type === "info") &&
    (typeof notification.transaction_id === "string" || notification.transaction_id === null) &&
    typeof notification.is_read === "boolean" &&
    typeof notification.created_at === "string" &&
    typeof notification.updated_at === "string"
  );
}
