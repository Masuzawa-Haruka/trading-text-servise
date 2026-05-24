"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getNotifications,
  markNotificationRead,
  notificationHref,
  type AppNotification,
} from "@/lib/notifications/api";

// ───────────────────────────────────────────
// 型定義
// ───────────────────────────────────────────

function notificationIcon(type: AppNotification["type"]): string {
  return type === "action_required" ? "!" : "i";
}

function notificationBadge(type: AppNotification["type"]): {
  label: string;
  className: string;
} {
  switch (type) {
    case "action_required":
      return { label: "要対応", className: "bg-blue-100 text-blue-700" };
    case "info":
      return { label: "お知らせ", className: "bg-slate-100 text-slate-600" };
  }
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return "たった今";
  if (minutes < 60) return `${minutes}分前`;
  if (hours < 24) return `${hours}時間前`;
  if (days < 7) return `${days}日前`;
  return new Date(isoString).toLocaleDateString("ja-JP");
}

// ───────────────────────────────────────────
// ページ本体
// ───────────────────────────────────────────

export default function InboxPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setIsLoading(true);
        setError(null);
        const loadedNotifications = await getNotifications();

        if (!isMounted) return;
        setNotifications(loadedNotifications);
      } catch (err) {
        if (!isMounted) return;
        setError(getInboxErrorMessage(err));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  function handleNotificationClick(notification: AppNotification) {
    if (notification.is_read) return;

    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id
          ? { ...item, is_read: true, updated_at: new Date().toISOString() }
          : item,
      ),
    );
    void markNotificationRead(notification.id).catch(() => {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, is_read: false } : item,
        ),
      );
    });
  }

  return (
    <main className="mx-auto min-h-dvh max-w-[430px] bg-white pb-24">
      <header className="sticky top-0 z-10 border-b border-slate-100 bg-white px-4 py-4">
        <h1 className="text-lg font-black text-slate-900">受信箱</h1>
      </header>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-slate-500">
          読み込み中...
        </div>
      ) : error ? (
        <div className="m-4 rounded-md bg-red-50 px-3 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      ) : notifications.length === 0 ? (
        <div className="py-16 text-center text-sm text-slate-500">
          通知はありません
        </div>
      ) : (
        <section className="divide-y divide-slate-100">
          {notifications.map((notification) => {
            const badge = notificationBadge(notification.type);
            return (
              <Link
                key={notification.id}
                href={notificationHref(notification)}
                onClick={() => handleNotificationClick(notification)}
                className={`flex gap-3 px-4 py-4 transition-colors hover:bg-slate-50 ${
                  notification.is_read ? "bg-white" : "bg-blue-50/40"
                }`}
              >
                {/* アイコン */}
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-black text-slate-700">
                  {notificationIcon(notification.type)}
                </div>

                {/* 本文 */}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-sm font-bold leading-snug text-slate-900">
                    {notification.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatRelativeTime(notification.created_at)}
                  </p>
                </div>

                {/* 未読ドット */}
                {!notification.is_read && (
                  <div className="mt-2 size-2.5 shrink-0 rounded-full bg-blue-600" />
                )}
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}

function getInboxErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "通知一覧の取得に失敗しました";
  }

  if (error.message.includes("タイムアウト") || error.message.includes("fetch")) {
    return "APIに接続できません。backendが起動しているか、NEXT_PUBLIC_API_BASE_URLを確認してください。";
  }

  if (error.message.includes("ログイン") || error.message.includes("認証")) {
    return "ログイン状態を確認してください。再ログインすると解消する場合があります。";
  }

  return error.message || "通知一覧の取得に失敗しました";
}
