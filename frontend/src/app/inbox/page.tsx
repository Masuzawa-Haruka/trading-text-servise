"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getTransactions,
  transactionNotificationText,
  isTransactionClosed,
  type Transaction,
} from "@/lib/transactions/api";
import { getItem as fetchItem } from "@/lib/items/api";

// ───────────────────────────────────────────
// 型定義
// ───────────────────────────────────────────

type TransactionNotification = {
  id: string;
  txId: string;
  title: string;
  updatedAt: string;
  closed: boolean; // completed / canceled → 既読扱い
  status: Transaction["status"];
};

// ───────────────────────────────────────────
// ステータスごとのアイコン
// ───────────────────────────────────────────

function statusIcon(status: Transaction["status"]): string {
  switch (status) {
    case "proposing":
      return "💬";
    case "scheduled":
      return "📅";
    case "completed":
      return "✅";
    case "canceled":
      return "❌";
  }
}

function statusBadge(status: Transaction["status"]): {
  label: string;
  className: string;
} {
  switch (status) {
    case "proposing":
      return {
        label: "取引中",
        className: "bg-blue-100 text-blue-700",
      };
    case "scheduled":
      return {
        label: "日程確定",
        className: "bg-emerald-100 text-emerald-700",
      };
    case "completed":
      return {
        label: "完了",
        className: "bg-slate-100 text-slate-500",
      };
    case "canceled":
      return {
        label: "キャンセル",
        className: "bg-red-100 text-red-600",
      };
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
  const [notifications, setNotifications] = useState<
    TransactionNotification[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const transactions = await getTransactions();

        // 各取引の item_id からアイテムタイトルを並列取得（エラーは null として扱う）
        const itemTitles = await Promise.all(
          transactions.map(async (tx) => {
            try {
              const item = await fetchItem(tx.item_id);
              return item.title;
            } catch {
              return null;
            }
          })
        );

        if (!isMounted) return;

        const notes: TransactionNotification[] = transactions.map((tx, i) => ({
          id: `tx_${tx.id}`,
          txId: tx.id,
          title: transactionNotificationText(tx.status, itemTitles[i]),
          updatedAt: tx.updated_at,
          closed: isTransactionClosed(tx.status),
          status: tx.status,
        }));

        setNotifications(notes);
      } catch (err) {
        if (!isMounted) return;
        setError(
          err instanceof Error ? err.message : "取引一覧の取得に失敗しました"
        );
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, []);

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
          取引の通知はありません
        </div>
      ) : (
        <section className="divide-y divide-slate-100">
          {notifications.map((note) => {
            const badge = statusBadge(note.status);
            return (
              <Link
                key={note.id}
                href={`/transactions/${note.txId}`}
                className={`flex gap-3 px-4 py-4 transition-colors hover:bg-slate-50 ${
                  note.closed ? "bg-white" : "bg-blue-50/40"
                }`}
              >
                {/* アイコン */}
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-100 text-lg">
                  {statusIcon(note.status)}
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
                    {note.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatRelativeTime(note.updatedAt)}
                  </p>
                </div>

                {/* 未読ドット */}
                {!note.closed && (
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
