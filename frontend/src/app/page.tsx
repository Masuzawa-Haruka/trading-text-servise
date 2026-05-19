"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { mockStore, MockItem } from "@/lib/mockStore";

export default function Home() {
  const [items, setItems] = useState<MockItem[]>([]);

  useEffect(() => {
    setItems(mockStore.getItems());
  }, []);

  return (
    <main className="mx-auto min-h-dvh max-w-[430px] bg-white">
      <header className="sticky top-0 z-10 border-b border-slate-100 bg-white px-4 pb-3 pt-4">
        <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-500">
          <span aria-hidden="true" className="text-xl text-slate-900">
            ⌕
          </span>
          <span className="min-w-0 flex-1 truncate">参考書名・科目・出版社で検索</span>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {["すべて", "0円のみ", "理学部", "工学部", "文学部"].map((category, index) => (
            <button
              key={category}
              type="button"
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                index === 0 ? "bg-[#0047c7] text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </header>

      <section className="px-4 py-3 pb-24">
        <h1 className="sr-only">参考書を探す</h1>
        <div className="divide-y divide-slate-100">
          {items.map((book) => (
            <Link href={`/items/${book.id}`} key={book.id} className="flex gap-3 py-4 hover:bg-slate-50 transition-colors">
              <div className="h-[92px] w-[66px] shrink-0 rounded border border-slate-200 bg-gradient-to-br from-slate-100 via-white to-blue-100 shadow-sm relative">
                {book.status !== "available" && (
                  <div className="absolute inset-0 bg-black/50 grid place-items-center rounded text-white font-bold text-xs rotate-[-15deg]">
                    SOLD
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  {book.free ? (
                    <span className="rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-black text-white">
                      Free!
                    </span>
                  ) : null}
                  <h2 className="truncate text-sm font-black text-slate-950">{book.title}</h2>
                </div>
                <p className="text-xs text-slate-600">著者　{book.author}</p>
                <p className="text-xs text-slate-600">状態　{book.condition}</p>
                <p className="mt-1 text-xl font-black text-red-500">{book.free ? "0円" : `${book.price}円`}</p>
                <p className="mt-1 text-[11px] text-slate-500">⌖ {book.campus}</p>
              </div>
              <div className="flex flex-col items-end justify-between pb-1 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                </div>
                {book.status === "available" && (
                  <span className="text-blue-600 font-bold">詳細 &gt;</span>
                )}
              </div>
            </Link>
          ))}
          {items.length === 0 && (
            <div className="py-10 text-center text-slate-500 text-sm">出品されている参考書がありません</div>
          )}
        </div>
      </section>
    </main>
  );
}
