"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  campusLabel,
  conditionLabel,
  getItems,
  type Campus,
  type Item,
  type ItemCondition,
} from "@/lib/items/api";

const FACULTY_OPTIONS = [
  { value: "", label: "すべての学部" },
  { value: "文学部", label: "文学部" },
  { value: "人間科学部", label: "人間科学部" },
  { value: "外国語学部", label: "外国語学部" },
  { value: "法学部", label: "法学部" },
  { value: "経済学部", label: "経済学部" },
  { value: "理学部", label: "理学部" },
  { value: "医学部", label: "医学部" },
  { value: "歯学部", label: "歯学部" },
  { value: "薬学部", label: "薬学部" },
  { value: "工学部", label: "工学部" },
  { value: "基礎工学部", label: "基礎工学部" },
];

const CAMPUS_OPTIONS: { value: "" | Campus; label: string }[] = [
  { value: "", label: "すべてのキャンパス" },
  { value: "toyonaka", label: "豊中" },
  { value: "suita", label: "吹田" },
  { value: "minoh", label: "箕面" },
];

const CONDITION_OPTIONS: { value: "" | ItemCondition; label: string }[] = [
  { value: "", label: "すべての状態" },
  { value: "new", label: "新品" },
  { value: "used_good", label: "傷少なめ" },
  { value: "used_bad", label: "傷あり" },
];

const PRICE_RANGE_OPTIONS = [
  { value: "all", label: "すべての価格" },
  { value: "free", label: "0円" },
  { value: "under500", label: "500円以下" },
  { value: "500to1000", label: "501〜1,000円" },
  { value: "over1000", label: "1,001円以上" },
] as const;

type PriceRange = (typeof PRICE_RANGE_OPTIONS)[number]["value"];

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [query, setQuery] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedCampus, setSelectedCampus] = useState<"" | Campus>("");
  const [selectedCondition, setSelectedCondition] = useState<"" | ItemCondition>("");
  const [selectedPriceRange, setSelectedPriceRange] = useState<PriceRange>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiParams = useMemo(() => {
    const priceRange = priceRangeToParams(selectedPriceRange);

    return {
      q: query.trim() || undefined,
      category: selectedFaculty || undefined,
      campus: selectedCampus || undefined,
      condition: selectedCondition || undefined,
      min_price: priceRange.min_price,
      max_price: priceRange.max_price,
    };
  }, [query, selectedCampus, selectedCondition, selectedFaculty, selectedPriceRange]);

  const hasActiveFilters = Boolean(
    query.trim() || selectedFaculty || selectedCampus || selectedCondition || selectedPriceRange !== "all",
  );

  useEffect(() => {
    let isMounted = true;

    getItems(apiParams)
      .then((data) => {
        if (!isMounted) return;
        setError(null);
        setItems(data);
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
  }, [apiParams]);

  function resetFilters() {
    setIsLoading(true);
    setQuery("");
    setSelectedFaculty("");
    setSelectedCampus("");
    setSelectedCondition("");
    setSelectedPriceRange("all");
    setError(null);
  }

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
              setIsLoading(true);
              setQuery(event.target.value);
              setError(null);
            }}
            placeholder="参考書名・科目・出版社で検索"
            className="min-w-0 flex-1 bg-transparent text-slate-900 outline-none placeholder:text-slate-500"
          />
        </label>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <FilterSelect
            label="学部"
            value={selectedFaculty}
            onChange={(value) => {
              setIsLoading(true);
              setSelectedFaculty(value);
            }}
            options={FACULTY_OPTIONS}
          />
          <FilterSelect
            label="キャンパス"
            value={selectedCampus}
            onChange={(value) => {
              setIsLoading(true);
              setSelectedCampus(value as "" | Campus);
            }}
            options={CAMPUS_OPTIONS}
          />
          <FilterSelect
            label="状態"
            value={selectedCondition}
            onChange={(value) => {
              setIsLoading(true);
              setSelectedCondition(value as "" | ItemCondition);
            }}
            options={CONDITION_OPTIONS}
          />
          <FilterSelect
            label="価格帯"
            value={selectedPriceRange}
            onChange={(value) => {
              setIsLoading(true);
              setSelectedPriceRange(value as PriceRange);
            }}
            options={PRICE_RANGE_OPTIONS}
          />
        </div>
        {hasActiveFilters ? (
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-500">{isLoading ? "検索中..." : `${items.length}件ヒット`}</span>
            <button type="button" onClick={resetFilters} className="font-bold text-blue-700">
              条件をクリア
            </button>
          </div>
        ) : null}
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
            <div className="py-10 text-center text-sm text-slate-500">
              {hasActiveFilters ? "条件に合う参考書がありません" : "出品されている参考書がありません"}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="py-10 text-center text-sm text-slate-500">読み込み中...</div>
        ) : null}
      </section>
    </main>
  );
}

function FilterSelect<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] font-bold text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-10 min-w-0 rounded-md border border-slate-200 bg-white px-2 text-xs font-bold text-slate-900 outline-none transition-colors focus:border-blue-500"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function priceRangeToParams(range: PriceRange): { min_price?: number; max_price?: number } {
  switch (range) {
    case "free":
      return { min_price: 0, max_price: 0 };
    case "under500":
      return { max_price: 500 };
    case "500to1000":
      return { min_price: 501, max_price: 1000 };
    case "over1000":
      return { min_price: 1001 };
    case "all":
      return {};
  }
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
