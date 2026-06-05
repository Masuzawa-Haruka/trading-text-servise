"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { campusLabel, conditionLabel, getItem, type Item } from "@/lib/items/api";
import { createTransactionForItem } from "@/lib/transactions/api";
import { getPublicUserProfile, type PublicUserProfile } from "@/lib/users/api";

export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);

  const [item, setItem] = useState<Item | null>(null);
  const [sellerProfile, setSellerProfile] = useState<PublicUserProfile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingTransaction, setIsStartingTransaction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    Promise.all([getItem(id), createClient().auth.getUser()])
      .then(async ([foundItem, userResult]) => {
        if (!isMounted) return;
        const profile = await getPublicUserProfile(foundItem.seller_id).catch(() => null);
        if (!isMounted) return;
        setItem(foundItem);
        setSellerProfile(profile);
        setCurrentUserId(userResult.data.user?.id ?? null);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "出品詳細の取得に失敗しました");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleStartTransaction = async () => {
    if (!item) return;
    setActionError(null);

    if (!currentUserId) {
      router.push(`/login?next=/items/${item.id}`);
      return;
    }

    if (item.seller_id === currentUserId) {
      alert("自分の商品は購入できません");
      return;
    }

    setIsStartingTransaction(true);
    try {
      const transaction = await createTransactionForItem(item);
      router.push(`/transactions/${transaction.id}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "取引開始に失敗しました");
    } finally {
      setIsStartingTransaction(false);
    }
  };

  if (isLoading) {
    return <div className="p-10 text-center text-slate-500">読み込み中...</div>;
  }

  if (error || !item) {
    return (
      <main className="mx-auto min-h-dvh max-w-[430px] bg-white p-6">
        <button onClick={() => router.back()} className="mb-6 text-sm font-bold text-slate-700">
          &lt; 戻る
        </button>
        <div className="rounded-md bg-red-50 px-3 py-3 text-sm font-bold text-red-700">
          {error ?? "出品が見つかりません"}
        </div>
      </main>
    );
  }

  const imageUrl = item.images[0]?.image_url;

  return (
    <main className="mx-auto min-h-dvh max-w-[430px] bg-[#f5f7fb] pb-24">
      <header className="sticky top-0 z-10 flex h-14 items-center border-b border-slate-100 bg-white px-4">
        <button onClick={() => router.back()} className="text-xl font-bold text-slate-700">
          &lt;
        </button>
        <h1 className="ml-4 truncate text-lg font-black text-slate-900">{item.title}</h1>
      </header>

      <div className="flex h-[300px] w-full items-center justify-center bg-gradient-to-br from-slate-100 via-white to-blue-100">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <span className="text-4xl text-slate-300">No Image</span>
        )}
      </div>

      <section className="bg-white px-4 py-5 shadow-sm">
        <div className="mb-2 flex items-start justify-between gap-3">
          <h2 className="min-w-0 text-xl font-black text-slate-900">{item.title}</h2>
          <span className="shrink-0 text-2xl font-black text-red-500">
            {item.price === 0 ? "0円" : `¥${item.price.toLocaleString()}`}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-[100px_1fr] gap-y-3 text-sm">
          <div className="font-bold text-slate-500">著者</div>
          <div className="text-slate-900">{item.author ?? "不明"}</div>

          <div className="font-bold text-slate-500">状態</div>
          <div className="text-slate-900">{conditionLabel(item.condition)}</div>

          <div className="font-bold text-slate-500">キャンパス</div>
          <div className="text-slate-900">{campusLabel(item.campus)}</div>

          <div className="font-bold text-slate-500">受け渡し場所</div>
          <div className="text-slate-900">{item.handoff_location ?? "未設定"}</div>

          <div className="font-bold text-slate-500">カテゴリ</div>
          <div className="text-slate-900">{item.category ?? "未設定"}</div>
        </div>

        {item.description ? (
          <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.description}</p>
        ) : null}
      </section>

      <section className="mt-2 bg-white px-4 py-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-slate-700">出品者情報</h3>
        <div className="flex items-center gap-3">
          <SellerAvatar profile={sellerProfile} fallbackId={item.seller_id} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="truncate font-bold text-slate-900">{sellerProfile?.nickname ?? "出品者"}</div>
              {sellerProfile ? (
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${scoreBadgeClass(sellerProfile.credit_score)}`}>
                  {sellerProfile.credit_score}点
                </span>
              ) : null}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
              <span>評価 {sellerProfile ? `${sellerProfile.evaluation_count}件` : "未取得"}</span>
              <span>{sellerProfile ? statusLabel(sellerProfile.status) : "プロフィール未取得"}</span>
            </div>
            <div className="mt-1 truncate text-[11px] text-slate-400">ID: {shortUserId(item.seller_id)}</div>
          </div>
        </div>
      </section>

      <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 z-20 mx-auto max-w-[430px] bg-white/90 p-4 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] backdrop-blur">
        {actionError ? (
          <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{actionError}</div>
        ) : null}
        {item.status === "available" ? (
          <button
            onClick={handleStartTransaction}
            disabled={isStartingTransaction}
            className="w-full rounded-full bg-[#0047c7] py-3.5 text-sm font-bold text-white shadow-md transition-transform hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isStartingTransaction ? "取引を開始中..." : "取引を開始する"}
          </button>
        ) : (
          <button disabled className="w-full rounded-full bg-slate-300 py-3.5 text-sm font-bold text-white">
            現在、取引中または売却済みです
          </button>
        )}
      </div>
    </main>
  );
}

function SellerAvatar({
  profile,
  fallbackId,
}: {
  profile: PublicUserProfile | null;
  fallbackId: string;
}) {
  const label = profile?.nickname?.trim() || fallbackId;
  const initial = label.slice(0, 1).toUpperCase();

  if (profile?.profile_image_url) {
    return (
      <div className="size-14 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={profile.profile_image_url} alt={profile.nickname} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className="grid size-14 shrink-0 place-items-center rounded-full bg-blue-50 text-lg font-black text-blue-700">
      {initial}
    </div>
  );
}

function scoreBadgeClass(score: number): string {
  if (score < 50) return "bg-red-100 text-red-700";
  if (score < 80) return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
}

function statusLabel(status: string): string {
  switch (status) {
    case "active":
      return "利用中";
    case "warning":
      return "要注意";
    case "suspended":
      return "停止中";
    default:
      return status;
  }
}

function shortUserId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 8)}...${id.slice(-4)}` : id;
}
