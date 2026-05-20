"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { mockStore, MockItem, MockUser } from "@/lib/mockStore";

export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [item, setItem] = useState<MockItem | null>(null);
  const [seller, setSeller] = useState<MockUser | null>(null);

  useEffect(() => {
    const foundItem = mockStore.getItem(id);
    if (foundItem) {
      setItem(foundItem);
      setSeller(mockStore.getUser(foundItem.sellerId));
    }
  }, [id]);

  if (!item || !seller) return <div className="p-10 text-center text-slate-500">Loading...</div>;

  const handleStartTransaction = () => {
    // 自分が出品した商品は自分で取引開始できない
    if (item.sellerId === mockStore.currentUser.id) {
      alert("自分の商品は購入できません");
      return;
    }
    
    // 取引を開始して、チャットルームへ遷移
    const tx = mockStore.createTransaction(item.id, item.sellerId);
    router.push(`/transactions/${tx.id}`);
  };

  return (
    <main className="mx-auto min-h-dvh max-w-[430px] bg-[#f5f7fb] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-14 items-center border-b border-slate-100 bg-white px-4">
        <button onClick={() => router.back()} className="text-xl font-bold text-slate-700">
          &lt;
        </button>
        <h1 className="ml-4 text-lg font-black text-slate-900 truncate">{item.title}</h1>
      </header>

      {/* 画面トップ：商品画像 */}
      <div className="h-[300px] w-full bg-gradient-to-br from-slate-100 via-white to-blue-100 flex items-center justify-center">
        <span className="text-4xl text-slate-300">No Image</span>
      </div>

      <section className="bg-white px-4 py-5 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900">{item.title}</h2>
          <div className="flex flex-col items-end">
            <span className="text-2xl font-black text-red-500">
              {item.free ? "0円" : `¥${item.price.toLocaleString()}`}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[100px_1fr] gap-y-3 text-sm">
          <div className="font-bold text-slate-500">著者</div>
          <div className="text-slate-900">{item.author}</div>

          <div className="font-bold text-slate-500">状態</div>
          <div className="text-slate-900">{item.condition}</div>

          <div className="font-bold text-slate-500">キャンパス</div>
          <div className="text-slate-900">{item.campus}</div>
        </div>
      </section>

      {/* 出品者情報 */}
      <section className="mt-2 bg-white px-4 py-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-slate-700">出品者情報</h3>
        <div className="flex items-center gap-3">
          <div className="grid size-12 shrink-0 place-items-center rounded-full bg-slate-200 text-xl">👤</div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-slate-900">{seller.nickname}</div>
            <div className="text-xs text-slate-600 mt-1">信用スコア: <span className="font-bold text-blue-600">{seller.creditScore}</span></div>
          </div>
          <span className="text-slate-400">&gt;</span>
        </div>
      </section>

      {/* Floating Action Button for Transaction */}
      <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 z-20 mx-auto max-w-[430px] bg-white/90 p-4 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] backdrop-blur">
        {item.status === "available" ? (
          <button
            onClick={handleStartTransaction}
            className="w-full rounded-full bg-[#0047c7] py-3.5 text-sm font-bold text-white shadow-md hover:bg-blue-700 active:scale-[0.98] transition-transform"
          >
            取引を開始する
          </button>
        ) : (
          <button
            disabled
            className="w-full rounded-full bg-slate-300 py-3.5 text-sm font-bold text-white"
          >
            現在、取引中または売却済みです
          </button>
        )}
      </div>
    </main>
  );
}
