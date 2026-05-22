"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { campusLabel, conditionLabel, getItems, type Item } from "@/lib/items/api";

const CATEGORY_FILTERS = ["すべて", "0円のみ", "理学部", "工学部", "文学部"];

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("すべて");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiParams = useMemo(() => {
    return {
      q: query.trim() || undefined,
      category:
        selectedCategory !== "すべて" && selectedCategory !== "0円のみ"
          ? selectedCategory
          : undefined,
    };
  }, [query, selectedCategory]);

  useEffect(() => {
    let isMounted = true;

    getItems(apiParams)
      .then((data) => {
        if (!isMounted) return;
        setItems(
          selectedCategory === "0円のみ"
            ? data.filter((item) => item.price === 0)
            : data
        );
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "出品一覧の取得に失敗しました");
        setItems([]);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [apiParams, selectedCategory]);

  return (
    <main className="mx-auto min-h-dvh max-w-[430px] bg-white">
      <header className="sticky top-0 z-10 border-b border-slate-100 bg-white px-4 pb-3 pt-4">
        <label className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-500">
          <span aria-hidden="true" className="text-xl text-slate-900">
            ⌕
          </span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setIsLoading(true);
              setError(null);
            }}
            placeholder="参考書名・科目・出版社で検索"
            className="min-w-0 flex-1 bg-transparent text-slate-900 outline-none placeholder:text-slate-500"
          />
        </label>
        <div className="mt-3 flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {CATEGORY_FILTERS.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => {
                setSelectedCategory(category);
                setIsLoading(true);
                setError(null);
              }}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                selectedCategory === category ? "bg-[#0047c7] text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </header>

      <section className="px-4 py-3 pb-24">
        <h1 className="sr-only">参考書を探す</h1>

        {error ? (
          <div className="rounded-md bg-red-50 px-3 py-3 text-sm font-bold text-red-700">{error}</div>
        ) : null}

        <div className="divide-y divide-slate-100">
          {items.map((book) => (
            <Link href={`/items/${book.id}`} key={book.id} className="flex gap-3 py-4 transition-colors hover:bg-slate-50">
              <BookCover item={book} />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  {book.price === 0 ? (
                    <span className="rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-black text-white">
                      Free!
                    </span>
                  ) : null}
                  <h2 className="truncate text-sm font-black text-slate-950">{book.title}</h2>
                </div>
                <p className="truncate text-xs text-slate-600">著者　{book.author ?? "不明"}</p>
                <p className="text-xs text-slate-600">状態　{conditionLabel(book.condition)}</p>
                <p className="mt-1 text-xl font-black text-red-500">
                  {book.price === 0 ? "0円" : `${book.price.toLocaleString()}円`}
                </p>
                <p className="mt-1 truncate text-[11px] text-slate-500">
                  ⌖ {campusLabel(book.campus)} / {book.category ?? "カテゴリ未設定"}
                </p>
                {book.handoff_location ? (
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">受け渡し　{book.handoff_location}</p>
                ) : null}
              </div>
              <div className="flex flex-col items-end justify-between pb-1 text-xs text-slate-500">
                {book.status === "available" && <span className="font-bold text-blue-600">詳細 &gt;</span>}
              </div>
            </Link>
          ))}

          {!isLoading && items.length === 0 && (
            <div className="py-10 text-center text-sm text-slate-500">出品されている参考書がありません</div>
          )}
        </div>

        {isLoading ? (
          <div className="py-10 text-center text-sm text-slate-500">読み込み中...</div>
        ) : null}
      </section>
    </main>
  );
}

function BookCover({ item }: { item: Item }) {
  const imageUrl = item.images[0]?.image_url;

  return (
    <div className="relative h-[92px] w-[66px] shrink-0 overflow-hidden rounded border border-slate-200 bg-gradient-to-br from-slate-100 via-white to-blue-100 shadow-sm">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={item.title} className="h-full w-full object-cover" />
      ) : null}
      {item.status !== "available" && (
        <>
          <div className="absolute inset-0 rounded bg-white/40" />
          <div className="absolute -bottom-1 -left-6 flex h-7 w-24 rotate-[-40deg] items-center justify-center bg-red-600 shadow">
            <span className="text-[10px] font-black tracking-widest text-white">SOLD</span>
          </div>
        </>
      )}
    </div>
  );
}
