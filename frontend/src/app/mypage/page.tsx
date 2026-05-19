"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { mockStore, MockItem, MockTransaction } from "@/lib/mockStore";

export default function MyPage() {
  const [soldItems, setSoldItems] = useState<MockItem[]>([]);
  const [boughtTxs, setBoughtTxs] = useState<MockTransaction[]>([]);

  useEffect(() => {
    const user = mockStore.currentUser;
    const allItems = mockStore.getItems();
    const allTxs = mockStore.getTransactions();

    setSoldItems(allItems.filter(i => i.sellerId === user.id));
    setBoughtTxs(allTxs.filter(t => t.buyerId === user.id));
  }, []);

  return (
    <main className="mx-auto min-h-dvh max-w-[430px] bg-[#f5f7fb] pb-24">
      <header className="sticky top-0 z-10 border-b border-slate-100 bg-white px-4 py-4 shadow-sm">
        <h1 className="text-lg font-black text-slate-900">マイページ</h1>
      </header>

      {/* プロフィール */}
      <section className="bg-white p-4">
        <div className="flex items-center gap-4">
          <div className="grid size-16 shrink-0 place-items-center rounded-full bg-slate-200 text-2xl">
            👤
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-slate-900">{mockStore.currentUser.nickname}</h2>
            <Link href="/mypage/score" className="mt-1 inline-flex items-center gap-2 text-sm text-slate-600 hover:opacity-80">
              <span>信用スコア</span>
              <span className="font-black text-blue-600">{mockStore.currentUser.creditScore}</span>
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

      {/* メニュー */}
      <section className="mt-3 bg-white">
        <div className="divide-y divide-slate-100 px-4 py-2">
          <div className="py-2">
            <h3 className="text-sm font-bold text-slate-500 mb-2">出品した参考書 ({soldItems.length})</h3>
            {soldItems.length > 0 ? (
              <ul className="space-y-2">
                {soldItems.map(item => (
                  <li key={item.id} className="text-sm text-slate-700 bg-slate-50 p-2 rounded flex justify-between">
                    <span className="truncate flex-1">{item.title}</span>
                    <span className="ml-2 text-xs font-bold text-blue-600">{item.status}</span>
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
            <h3 className="text-sm font-bold text-slate-500 mb-2">購入取引 ({boughtTxs.length})</h3>
            {boughtTxs.length > 0 ? (
              <ul className="space-y-2">
                {boughtTxs.map(tx => {
                  const item = mockStore.getItem(tx.itemId);
                  return (
                    <li key={tx.id} className="text-sm text-slate-700 bg-slate-50 p-2 rounded flex justify-between">
                      <span className="truncate flex-1"><Link href={`/transactions/${tx.id}`} className="hover:underline">{item?.title}</Link></span>
                      <span className="ml-2 text-xs font-bold text-blue-600">{tx.status}</span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">まだありません</p>
            )}
          </div>
        </div>
      </section>
      
      <section className="mt-3 bg-white">
        <div className="divide-y divide-slate-100">
          <button className="flex w-full items-center justify-between px-4 py-4 text-sm font-bold text-slate-700 hover:bg-slate-50">
            <span>設定</span>
            <span className="text-slate-400">&gt;</span>
          </button>
          <button className="flex w-full items-center justify-between px-4 py-4 text-sm font-bold text-slate-700 hover:bg-slate-50">
            <span>ヘルプ・お問い合わせ</span>
            <span className="text-slate-400">&gt;</span>
          </button>
        </div>
      </section>

      {/* ログアウト */}
      <div className="mt-6 px-4">
        <button
          type="button"
          className="w-full rounded bg-white py-3 text-sm font-bold text-red-500 shadow-sm border border-slate-100"
        >
          ログアウト
        </button>
      </div>
    </main>
  );
}
