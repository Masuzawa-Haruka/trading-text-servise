const STORAGE_KEY = "mypage_notification_settings";

export type NotificationSettings = {
  newTransaction: boolean;
  scheduleProposal: boolean;
  scheduleConfirmed: boolean;
  dayOfReminder: boolean;
  evaluated: boolean;
  cancellation: boolean;
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  newTransaction: true,
  scheduleProposal: true,
  scheduleConfirmed: true,
  dayOfReminder: true,
  evaluated: true,
  cancellation: true,
};

export function readNotificationSettings(): NotificationSettings {
  if (typeof window === "undefined") {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }

  try {
    const parsed = JSON.parse(raw);
    return isNotificationSettings(parsed) ? parsed : DEFAULT_NOTIFICATION_SETTINGS;
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

export function writeNotificationSettings(settings: NotificationSettings): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function areAllNotificationsEnabled(settings: NotificationSettings): boolean {
  return Object.values(settings).every(Boolean);
}

function isNotificationSettings(value: unknown): value is NotificationSettings {
  if (!value || typeof value !== "object") {
    return false;
  }

  const settings = value as Record<string, unknown>;
  return Object.keys(DEFAULT_NOTIFICATION_SETTINGS).every(
    (key) => typeof settings[key] === "boolean",
  );
}
