"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";
import { getItem, getItems, type Item, type ItemStatus } from "@/lib/items/api";
import { getTransactions, type Transaction } from "@/lib/transactions/api";
import { getMyProfile, type UserProfile } from "@/lib/users/api";

type MyPageData = {
  profile: UserProfile;
  soldItems: Item[];
  boughtTransactions: Array<{
    transaction: Transaction;
    item: Item | null;
  }>;
};

export default function MyPage() {
  const router = useRouter();
  const [data, setData] = useState<MyPageData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadMyPage() {
      try {
        const [profile, itemsByStatus, transactions] = await Promise.all([
          getMyProfile(),
          Promise.all(ITEM_STATUSES.map((status) => getItems({ status }))),
          getTransactions(),
        ]);
        const allItems = itemsByStatus.flat();
        const itemById = new Map(allItems.map((item) => [item.id, item]));
        const boughtTransactions = await Promise.all(
          transactions
            .filter((transaction) => transaction.buyer_id === profile.id)
            .map(async (transaction) => {
              const cachedItem = itemById.get(transaction.item_id);
              if (cachedItem) return { transaction, item: cachedItem };
              try {
                return { transaction, item: await getItem(transaction.item_id) };
              } catch {
                return { transaction, item: null };
              }
            }),
        );

        if (!ignore) {
          setData({
            profile,
            soldItems: allItems.filter((item) => item.seller_id === profile.id),
            boughtTransactions,
          });
        }
      } catch (caughtError) {
        if (!ignore) {
          if (caughtError instanceof Error && caughtError.message === "ログインが必要です") {
            router.replace("/login");
            return;
          }
          setError("マイページ情報を取得できませんでした");
        }
      }
    }

    void loadMyPage();

    return () => {
      ignore = true;
    };
  }, [router]);

  const profile = data?.profile;

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
              {profile?.nickname ?? "読み込み中..."}
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
              出品した参考書 ({data?.soldItems.length ?? 0})
            </h3>
            {data === null ? (
              <p className="text-xs text-slate-400">読み込み中...</p>
            ) : data.soldItems.length > 0 ? (
              <ul className="space-y-2">
                {data.soldItems.map((item) => (
                  <li key={item.id} className="flex justify-between rounded bg-slate-50 p-2 text-sm text-slate-700">
                    <span className="flex-1 truncate">{item.title}</span>
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
              購入取引 ({data?.boughtTransactions.length ?? 0})
            </h3>
            {data === null ? (
              <p className="text-xs text-slate-400">読み込み中...</p>
            ) : data.boughtTransactions.length > 0 ? (
              <ul className="space-y-2">
                {data.boughtTransactions.map(({ transaction, item }) => (
                  <li key={transaction.id} className="flex justify-between rounded bg-slate-50 p-2 text-sm text-slate-700">
                    <span className="flex-1 truncate">
                      <Link href={`/transactions/${transaction.id}`} className="hover:underline">
                        {item?.title ?? "取引中の参考書"}
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
