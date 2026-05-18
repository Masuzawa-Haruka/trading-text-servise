export default function SellPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-[430px] bg-white pb-10">
      <header className="sticky top-0 z-10 border-b border-slate-100 bg-white px-4 py-4">
        <h1 className="text-lg font-black text-slate-900">出品する</h1>
      </header>

      <form className="flex flex-col gap-6 p-4">
        {/* 画像アップロード */}
        <section>
          <label className="mb-2 block text-sm font-bold text-slate-700">
            商品画像 <span className="text-xs font-normal text-red-500">*必須</span>
          </label>
          <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
            <button
              type="button"
              className="grid size-20 shrink-0 place-items-center rounded bg-slate-100 text-slate-400 border border-dashed border-slate-300"
            >
              <span className="text-2xl">+</span>
            </button>
            <div className="size-20 shrink-0 rounded border border-slate-200 bg-gradient-to-br from-slate-100 via-white to-blue-100 shadow-sm" />
          </div>
        </section>

        {/* 商品詳細 */}
        <section className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              参考書名 <span className="text-xs font-normal text-red-500">*必須</span>
            </label>
            <input
              type="text"
              placeholder="例: 基礎からの線形代数"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              状態 <span className="text-xs font-normal text-red-500">*必須</span>
            </label>
            <select className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">選択してください</option>
              <option value="new">新品・未使用</option>
              <option value="used_good">目立った傷や汚れなし</option>
              <option value="used_bad">傷や汚れあり</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              キャンパス <span className="text-xs font-normal text-red-500">*必須</span>
            </label>
            <select className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">選択してください</option>
              <option value="toyonaka">豊中キャンパス</option>
              <option value="suita">吹田キャンパス</option>
              <option value="minoh">箕面キャンパス</option>
            </select>
          </div>
        </section>

        {/* 価格 */}
        <section>
          <label className="mb-1 block text-sm font-bold text-slate-700">
            価格 <span className="text-xs font-normal text-red-500">*必須</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">¥</span>
            <input
              type="number"
              placeholder="0"
              className="w-full rounded-md border border-slate-300 py-2 pl-7 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">※0円(無償譲渡)も可能です</p>
        </section>

        {/* 送信ボタン */}
        <button
          type="button"
          className="mt-4 w-full rounded-full bg-[#0047c7] py-3 text-sm font-bold text-white shadow-md hover:bg-blue-700"
        >
          出品する
        </button>
      </form>
    </main>
  );
}
