const books = [
  {
    title: "基礎からの線形代数",
    author: "石村園子",
    condition: "良い",
    campus: "豊中キャンパス",
    likes: 12,
    free: true,
  },
  {
    title: "ミクロ経済学の基礎",
    author: "大山道広",
    condition: "良い",
    campus: "吹田キャンパス",
    likes: 8,
    free: true,
  },
  {
    title: "化学の新研究",
    author: "卯田正彦",
    condition: "やや良い",
    campus: "豊中キャンパス",
    likes: 5,
    free: false,
  },
];

export default function Home() {
  return (
    <main className="mx-auto min-h-dvh max-w-[430px] bg-white">
      <header className="sticky top-0 z-10 border-b border-slate-100 bg-white px-4 pb-3 pt-4">
        <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-500">
          <span aria-hidden="true" className="text-xl text-slate-900">
            ⌕
          </span>
          <span className="min-w-0 flex-1 truncate">参考書名・科目・出版社で検索</span>
          <button type="button" aria-label="絞り込み" className="grid size-7 place-items-center text-slate-900">
            ▽
          </button>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {["すべて", "0円のみ", "文系", "理系", "工学部"].map((category, index) => (
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

      <section className="px-4 py-3">
        <h1 className="sr-only">参考書を探す</h1>
        <div className="divide-y divide-slate-100">
          {books.map((book) => (
            <article key={book.title} className="flex gap-3 py-4">
              <div className="h-[92px] w-[66px] shrink-0 rounded border border-slate-200 bg-gradient-to-br from-slate-100 via-white to-blue-100 shadow-sm" />
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
                <p className="mt-1 text-xl font-black text-red-500">{book.free ? "0円" : "300円"}</p>
                <p className="mt-1 text-[11px] text-slate-500">⌖ {book.campus}</p>
              </div>
              <div className="flex items-end gap-1 pb-1 text-xs text-slate-500">
                <span aria-hidden="true" className="text-lg">
                  ♡
                </span>
                {book.likes}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
