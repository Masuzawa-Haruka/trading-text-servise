"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";
import { getItems, type Item, type ItemStatus } from "@/lib/items/api";
import { getTransactions, type Transaction } from "@/lib/transactions/api";
import { getMyProfile, type UserProfile } from "@/lib/users/api";

type BoughtTransaction = {
  transaction: Transaction;
  itemTitle: string;
};

type ItemStatusGroup = {
  status: ItemStatus;
  title: string;
  items: Item[];
};

export default function MyPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [soldItems, setSoldItems] = useState<Item[]>([]);
  const [boughtTransactions, setBoughtTransactions] = useState<BoughtTransaction[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadMyPage() {
      let loadedProfile: UserProfile | null = null;

      try {
        setProfileLoading(true);
        setHistoryLoading(true);
        setError(null);
        setHistoryError(null);

        loadedProfile = await getMyProfile();
        if (ignore) return;

        setProfile(loadedProfile);
        setProfileLoading(false);
        const profileId = loadedProfile.id;

        const [itemsByStatus, transactions] = await Promise.all([
          Promise.all(ITEM_STATUSES.map((status) => getItems({ status }))),
          getTransactions(),
        ]);
        if (ignore) return;

        const allItems = itemsByStatus.flat();
        setSoldItems(allItems.filter((item) => item.seller_id === profileId));
        setBoughtTransactions(
          transactions
            .filter((transaction) => transaction.buyer_id === profileId)
            .map((transaction) => ({
              transaction,
              itemTitle: transaction.item_title ?? "取引中の参考書",
            })),
        );
      } catch (caughtError) {
        if (!ignore) {
          if (caughtError instanceof Error && caughtError.message === "ログインが必要です") {
            router.replace("/login");
            return;
          }
          if (loadedProfile === null) {
            setError(getMyPageErrorMessage(caughtError, "プロフィールを取得できませんでした"));
          } else {
            setHistoryError(
              getMyPageErrorMessage(caughtError, "取引・出品履歴を取得できませんでした"),
            );
          }
        }
      } finally {
        if (!ignore) {
          setProfileLoading(false);
          setHistoryLoading(false);
        }
      }
    }

    void loadMyPage();

    return () => {
      ignore = true;
    };
  }, [reloadKey, router]);

  const soldItemGroups: ItemStatusGroup[] = ITEM_STATUSES.map((status) => ({
    status,
    title: itemStatusGroupLabel(status),
    items: soldItems.filter((item) => item.status === status),
  }));

  return (
    <main className="mx-auto min-h-dvh max-w-[430px] bg-[#f5f7fb] pb-24">
      <header className="sticky top-0 z-10 border-b border-slate-100 bg-white px-4 py-4 shadow-sm">
        <h1 className="text-lg font-black text-slate-900">マイページ</h1>
      </header>

      <section className="bg-white p-4">
        <div className="flex items-center gap-4">
          <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-200 text-2xl">
            {profile?.profile_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.profile_image_url} alt="" className="size-full object-cover" />
            ) : (
              <span aria-hidden="true">👤</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold text-slate-900">
              {profileLoading ? "読み込み中..." : profile?.nickname ?? "プロフィール未取得"}
            </h2>
            <p className="truncate text-xs text-slate-500">{profile?.email ?? ""}</p>
            <Link href="/mypage/score" className="mt-1 inline-flex items-center gap-2 text-sm text-slate-600 hover:opacity-80">
              <span>信用スコア</span>
              <span className="font-black text-blue-600">{profile?.credit_score ?? "-"}</span>
            </Link>
          </div>
          <Link
            href="/mypage/edit"
            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            編集
          </Link>
        </div>
      </section>

      {error ? (
        <section className="mt-3 bg-white px-4 py-3">
          <p className="text-sm font-bold text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => setReloadKey((current) => current + 1)}
            className="mt-2 rounded-full border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600"
          >
            再読み込み
          </button>
        </section>
      ) : null}

      <section className="mt-3 bg-white">
        <HistorySectionHeader title="出品した参考書" count={soldItems.length} />
        <div className="px-4 pb-4">
          {historyLoading ? (
            <HistoryLoading />
          ) : historyError ? (
            <HistoryError
              message={historyError}
              onRetry={() => setReloadKey((current) => current + 1)}
            />
          ) : soldItems.length > 0 ? (
            <div className="space-y-4">
              {soldItemGroups.map((group) => (
                <SoldItemGroup key={group.status} group={group} />
              ))}
            </div>
          ) : (
            <EmptyHistory
              title="まだ出品した参考書がありません"
              description="使い終わった参考書を出品すると、ここで状態を確認できます。"
              href="/sell"
              actionLabel="出品する"
            />
          )}
        </div>

        <div className="border-t border-slate-100" />

        <HistorySectionHeader title="購入取引" count={boughtTransactions.length} />
        <div className="px-4 pb-4">
          {historyLoading ? (
            <HistoryLoading />
          ) : historyError ? (
            <HistoryError
              message={historyError}
              onRetry={() => setReloadKey((current) => current + 1)}
            />
          ) : boughtTransactions.length > 0 ? (
            <ul className="space-y-2">
              {boughtTransactions.map(({ transaction, itemTitle }) => (
                <BoughtTransactionCard
                  key={transaction.id}
                  transaction={transaction}
                  itemTitle={itemTitle}
                />
              ))}
            </ul>
          ) : (
            <EmptyHistory
              title="まだ購入取引がありません"
              description="気になる参考書を見つけたら、取引開始後にここへ表示されます。"
              href="/"
              actionLabel="探す"
            />
          )}
        </div>
      </section>

      <section className="mt-3 bg-white">
        <div className="divide-y divide-slate-100">
          <Link href="/mypage/settings/notifications" className="flex w-full items-center justify-between px-4 py-4 text-sm font-bold text-slate-700 hover:bg-slate-50">
            <span>プッシュ通知</span>
            <span className="text-slate-400">&gt;</span>
          </Link>
          <Link href="/mypage/support" className="flex w-full items-center justify-between px-4 py-4 text-sm font-bold text-slate-700 hover:bg-slate-50">
            <span>ヘルプ・サポート</span>
            <span className="text-slate-400">&gt;</span>
          </Link>
        </div>
      </section>

      <div className="mt-6 px-4">
        <SignOutButton />
      </div>
    </main>
  );
}

const ITEM_STATUSES: ItemStatus[] = ["available", "matching", "completed", "canceled"];

function HistorySectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center justify-between px-4 pb-2 pt-4">
      <h3 className="text-sm font-black text-slate-700">{title}</h3>
      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">
        {count}件
      </span>
    </div>
  );
}

function HistoryLoading() {
  return (
    <div className="space-y-2">
      <div className="h-14 rounded-md bg-slate-100" />
      <div className="h-14 rounded-md bg-slate-50" />
    </div>
  );
}

function HistoryError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-md bg-red-50 px-3 py-3">
      <p className="text-xs font-bold leading-5 text-red-600">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600"
      >
        再読み込み
      </button>
    </div>
  );
}

function EmptyHistory({
  title,
  description,
  href,
  actionLabel,
}: {
  title: string;
  description: string;
  href: string;
  actionLabel: string;
}) {
  return (
    <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-4">
      <p className="text-sm font-bold text-slate-700">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      <Link
        href={href}
        className="mt-3 inline-flex rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white"
      >
        {actionLabel}
      </Link>
    </div>
  );
}

function SoldItemGroup({ group }: { group: ItemStatusGroup }) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-black text-slate-500">{group.title}</h4>
        <span className="text-xs font-bold text-slate-400">{group.items.length}</span>
      </div>
      {group.items.length > 0 ? (
        <ul className="space-y-2">
          {group.items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/items/${item.id}`}
                className="block rounded-md border border-slate-100 bg-white px-3 py-3 shadow-sm hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{item.title}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {[item.author, item.category].filter(Boolean).join(" / ") || "詳細未設定"}
                    </p>
                  </div>
                  <StatusBadge label={statusLabel(item.status)} tone={statusTone(item.status)} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">{formatPrice(item.price)}</span>
                  <span className="text-slate-400">詳細を見る</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-400">
          この状態の出品はありません
        </p>
      )}
    </section>
  );
}

function BoughtTransactionCard({
  transaction,
  itemTitle,
}: {
  transaction: Transaction;
  itemTitle: string;
}) {
  const meetingSummary = formatMeetingSummary(transaction);

  return (
    <li>
      <Link
        href={`/transactions/${transaction.id}`}
        className="block rounded-md border border-slate-100 bg-white px-3 py-3 shadow-sm hover:bg-slate-50"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">{itemTitle}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{meetingSummary}</p>
          </div>
          <StatusBadge
            label={statusLabel(transaction.status)}
            tone={transactionStatusTone(transaction.status)}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700">
            {transaction.final_price === null ? "価格未確定" : formatPrice(transaction.final_price)}
          </span>
          <span className="text-slate-400">取引詳細へ</span>
        </div>
      </Link>
    </li>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: "blue" | "green" | "red" | "slate" }) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    slate: "bg-slate-100 text-slate-600",
  }[tone];

  return (
    <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-black ${toneClass}`}>
      {label}
    </span>
  );
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    available: "出品中",
    matching: "取引中",
    completed: "完了",
    canceled: "キャンセル",
    proposing: "提案中",
    scheduled: "予定確定",
  };

  return labels[status] ?? status;
}

function itemStatusGroupLabel(status: ItemStatus): string {
  switch (status) {
    case "available":
      return "出品中";
    case "matching":
      return "取引中";
    case "completed":
      return "完了";
    case "canceled":
      return "キャンセル";
  }
}

function statusTone(status: ItemStatus): "blue" | "green" | "red" | "slate" {
  switch (status) {
    case "available":
      return "blue";
    case "matching":
      return "green";
    case "completed":
      return "slate";
    case "canceled":
      return "red";
  }
}

function transactionStatusTone(status: Transaction["status"]): "blue" | "green" | "red" | "slate" {
  switch (status) {
    case "proposing":
      return "blue";
    case "scheduled":
      return "green";
    case "completed":
      return "slate";
    case "canceled":
      return "red";
  }
}

function formatPrice(price: number): string {
  return price === 0 ? "0円" : `${price.toLocaleString("ja-JP")}円`;
}

function formatMeetingSummary(transaction: Transaction): string {
  const datetime = transaction.meeting_datetime
    ? new Date(transaction.meeting_datetime).toLocaleString("ja-JP", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const place = transaction.meeting_place;

  if (datetime && place) return `${datetime} / ${place}`;
  if (datetime) return datetime;
  if (place) return place;
  return "受け渡し日時・場所は未確定";
}

function getMyPageErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) {
    return fallback;
  }

  if (error.message.includes("タイムアウト") || error.message.includes("fetch")) {
    return "APIに接続できません。backendが起動しているか、NEXT_PUBLIC_API_BASE_URLを確認してください。";
  }

  if (error.message.includes("ログイン") || error.message.includes("認証")) {
    return "ログイン状態を確認してください。再ログインすると解消する場合があります。";
  }

  return error.message || fallback;
}
