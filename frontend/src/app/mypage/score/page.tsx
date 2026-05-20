"use client";

import { useRouter } from "next/navigation";
import { mockStore } from "@/lib/mockStore";

export default function CreditScorePage() {
  const router = useRouter();
  const score = mockStore.currentUser.creditScore; // 110 in the mock or whatever it is
  
  // Calculate width for the progress bar (100 to 150)
  const minScore = 100;
  const maxScore = 150;
  const progressPercent = Math.max(0, Math.min(100, ((score - minScore) / (maxScore - minScore)) * 100));

  return (
    <main className="mx-auto min-h-dvh max-w-[430px] bg-[#f5f7fb] pb-24">
      <header className="sticky top-0 z-10 flex items-center border-b border-slate-100 bg-white px-4 py-4 shadow-sm">
        <button onClick={() => router.back()} className="text-xl font-bold text-slate-700">
          &lt;
        </button>
        <h1 className="ml-4 text-base font-black text-slate-900">信用スコア</h1>
      </header>

      <section className="p-4">
        {/* スコアカード */}
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <h2 className="text-xs font-bold text-slate-700">あなたの信用スコア</h2>
          
          <div className="mt-3 flex items-end gap-2">
            <div className="text-5xl font-black text-slate-900 tracking-tighter">{score}</div>
            <div className="text-sm font-bold text-slate-500 mb-1">点</div>
            <div className="ml-2 text-3xl">🌱</div>
            <div className="ml-1 rounded-full bg-green-200/50 px-3 py-1 text-sm font-bold text-green-800">
              レギュラー
            </div>
          </div>

          <div className="mt-4 flex gap-6 text-sm font-bold text-slate-700">
            <div>取引実績 <span className="text-slate-900">5件</span></div>
            <div>良かった率 <span className="text-slate-900">100%</span></div>
          </div>

          <div className="mt-8 relative">
            {/* ProgressBar Track */}
            <div className="h-1 w-full bg-slate-200 rounded-full">
              <div 
                className="h-full bg-green-500 rounded-full" 
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            {/* Markers */}
            <div className="absolute top-1/2 -mt-2 w-full flex justify-between text-xs font-bold px-1">
              <div className="flex flex-col items-center -ml-2">
                <div className="h-3 w-0.5 bg-green-500 mb-1"></div>
                <span className="text-slate-900">100</span>
                <span className="text-green-600 font-normal mt-1">レギュラー</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="h-3 w-0.5 bg-slate-300 mb-1"></div>
                <span className="text-slate-900">120</span>
                <span className="text-green-600 font-normal mt-1">トラスト</span>
              </div>
              <div className="flex flex-col items-center -mr-2">
                <div className="h-3 w-0.5 bg-slate-300 mb-1"></div>
                <span className="text-slate-900">150</span>
                <span className="text-slate-500 font-normal mt-1">エキスパート</span>
              </div>
            </div>
          </div>
          <div className="h-8"></div> {/* Spacer for the markers */}
        </div>
      </section>

      <section className="mt-2 bg-white">
        <h3 className="px-4 py-3 text-xs font-bold text-slate-900 border-b border-slate-100">
          スコアの内訳
        </h3>
        <div className="divide-y divide-slate-100">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-full bg-green-50 text-green-500 text-lg">
                <span className="material-icons text-xl">✓</span>
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">取引の完了率</div>
                <div className="text-xs text-slate-500">取引を最後まで完了した割合</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-green-600">100%</span>
              <span className="text-slate-400">&gt;</span>
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-full bg-green-50 text-green-500 text-lg">
                <span className="material-icons text-xl">👍</span>
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">良かった評価の割合</div>
                <div className="text-xs text-slate-500">良い評価を受けた割合</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-green-600">100%</span>
              <span className="text-slate-400">&gt;</span>
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-full bg-blue-50 text-blue-500 text-lg">
                <span className="material-icons text-xl">📄</span>
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">取引件数</div>
                <div className="text-xs text-slate-500">これまでの取引件数</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-900">5件</span>
              <span className="text-slate-400">&gt;</span>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 mt-6">
        <div className="rounded-xl bg-blue-50 p-4 text-blue-900">
          <div className="flex items-center gap-2 mb-1">
            <span className="grid size-4 place-items-center rounded-full border border-blue-500 text-[10px] font-bold text-blue-500">i</span>
            <span className="text-xs font-bold">スコアを上げるコツ</span>
          </div>
          <p className="text-xs leading-relaxed text-blue-800/80">
            取引を丁寧に完了し、良い評価を積み重ねることでスコアが上がります。
          </p>
        </div>
        <p className="mt-3 text-[10px] text-slate-400 text-center">
          ※ スコアは定期的に更新されます
        </p>
      </section>
    </main>
  );
}
