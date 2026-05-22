"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { campusLabel, conditionLabel, getItem, type Item } from "@/lib/items/api";

export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);

  const [item, setItem] = useState<Item | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      getItem(id),
      createClient().auth.getUser(),
    ])
      .then(([foundItem, userResult]) => {
        if (!isMounted) return;
        setItem(foundItem);
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

  const handleStartTransaction = () => {
    if (!item) return;

    if (!currentUserId) {
      router.push(`/login?next=/items/${item.id}`);
      return;
    }

    if (item.seller_id === currentUserId) {
      alert("自分の商品は購入できません");
      return;
    }

    alert("取引開始APIの結合は次の実装で対応します");
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
          <div className="grid size-12 shrink-0 place-items-center rounded-full bg-slate-200 text-xl">👤</div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-slate-900">出品者</div>
            <div className="mt-1 truncate text-xs text-slate-600">ID: {item.seller_id}</div>
          </div>
        </div>
      </section>

      <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 z-20 mx-auto max-w-[430px] bg-white/90 p-4 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] backdrop-blur">
        {item.status === "available" ? (
          <button
            onClick={handleStartTransaction}
            className="w-full rounded-full bg-[#0047c7] py-3.5 text-sm font-bold text-white shadow-md transition-transform hover:bg-blue-700 active:scale-[0.98]"
          >
            取引を開始する
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
