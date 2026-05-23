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

export default function MyPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [soldItems, setSoldItems] = useState<Item[]>([]);
  const [boughtTransactions, setBoughtTransactions] = useState<BoughtTransaction[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

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
            setError("プロフィールを取得できませんでした");
          } else {
            setHistoryError("取引・出品履歴を取得できませんでした");
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
  }, [router]);

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
        </section>
      ) : null}

      <section className="mt-3 bg-white">
        <div className="divide-y divide-slate-100 px-4 py-2">
          <div className="py-2">
            <h3 className="mb-2 text-sm font-bold text-slate-500">
              出品した参考書 ({soldItems.length})
            </h3>
            {historyLoading ? (
              <p className="text-xs text-slate-400">読み込み中...</p>
            ) : historyError ? (
              <p className="text-xs font-bold text-red-500">{historyError}</p>
            ) : soldItems.length > 0 ? (
              <ul className="space-y-2">
                {soldItems.map((item) => (
                  <li key={item.id} className="flex justify-between rounded bg-slate-50 p-2 text-sm text-slate-700">
                    <Link href={`/items/${item.id}`} className="flex-1 truncate hover:underline">
                      {item.title}
                    </Link>
                    <span className="ml-2 text-xs font-bold text-blue-600">{statusLabel(item.status)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">まだありません</p>
            )}
          </div>
        </div>
        <div className="divide-y divide-slate-100 px-4 py-2">
          <div className="py-2">
            <h3 className="mb-2 text-sm font-bold text-slate-500">
              購入取引 ({boughtTransactions.length})
            </h3>
            {historyLoading ? (
              <p className="text-xs text-slate-400">読み込み中...</p>
            ) : historyError ? (
              <p className="text-xs font-bold text-red-500">{historyError}</p>
            ) : boughtTransactions.length > 0 ? (
              <ul className="space-y-2">
                {boughtTransactions.map(({ transaction, itemTitle }) => (
                  <li key={transaction.id} className="flex justify-between rounded bg-slate-50 p-2 text-sm text-slate-700">
                    <span className="flex-1 truncate">
                      <Link href={`/transactions/${transaction.id}`} className="hover:underline">
                        {itemTitle}
                      </Link>
                    </span>
                    <span className="ml-2 text-xs font-bold text-blue-600">{statusLabel(transaction.status)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">まだありません</p>
            )}
          </div>
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
