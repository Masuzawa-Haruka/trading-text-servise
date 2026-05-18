export default function MyPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-[430px] bg-[#f5f7fb]">
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
            <h2 className="text-lg font-bold text-slate-900">阪大 太郎</h2>
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
              <span>信用スコア</span>
              <span className="font-black text-blue-600">100</span>
            </div>
          </div>
          <button
            type="button"
            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            編集
          </button>
        </div>
      </section>

      {/* メニュー */}
      <section className="mt-3 bg-white">
        <div className="divide-y divide-slate-100">
          <button className="flex w-full items-center justify-between px-4 py-4 text-sm font-bold text-slate-700 hover:bg-slate-50">
            <span>出品した参考書</span>
            <span className="text-slate-400">&gt;</span>
          </button>
          <button className="flex w-full items-center justify-between px-4 py-4 text-sm font-bold text-slate-700 hover:bg-slate-50">
            <span>購入した参考書</span>
            <span className="text-slate-400">&gt;</span>
          </button>
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
