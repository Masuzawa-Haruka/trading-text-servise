"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getTransactions, type Transaction } from "@/lib/transactions/api";
import { getMyProfile, type UserProfile } from "@/lib/users/api";

export default function CreditScorePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadScore() {
      try {
        const [loadedProfile, loadedTransactions] = await Promise.all([
          getMyProfile(),
          getTransactions(),
        ]);
        if (!ignore) {
          setProfile(loadedProfile);
          setTransactions(loadedTransactions);
        }
      } catch (caughtError) {
        if (!ignore) {
          if (caughtError instanceof Error && caughtError.message === "ログインが必要です") {
            router.replace("/login");
            return;
          }
          setError("信用スコアを取得できませんでした");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadScore();

    return () => {
      ignore = true;
    };
  }, [router]);

  const score = profile?.credit_score ?? 100;
  const totalTransactions = transactions.length;
  const completedTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.status === "completed").length,
    [transactions],
  );
  const completionRate =
    totalTransactions > 0 ? Math.round((completedTransactions / totalTransactions) * 100) : 0;
  const minScore = 100;
  const maxScore = 150;
  const progressPercent = Math.max(0, Math.min(100, ((score - minScore) / (maxScore - minScore)) * 100));
  const rank = score >= 150 ? "エキスパート" : score >= 120 ? "トラスト" : "レギュラー";

  return (
    <main className="mx-auto min-h-dvh max-w-[430px] bg-[#f5f7fb] pb-24">
      <header className="sticky top-0 z-10 flex items-center border-b border-slate-100 bg-white px-4 py-4 shadow-sm">
        <button onClick={() => router.back()} className="text-xl font-bold text-slate-700">
          &lt;
        </button>
        <h1 className="ml-4 text-base font-black text-slate-900">信用スコア</h1>
      </header>

      {error ? (
        <section className="m-4 rounded-lg bg-red-50 px-3 py-2">
          <p className="text-xs font-bold text-red-600">{error}</p>
        </section>
      ) : null}

      <section className="p-4">
        <div className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-xs font-bold text-slate-700">あなたの信用スコア</h2>

          <div className="mt-3 flex items-end gap-2">
            <div className="text-5xl font-black tracking-tighter text-slate-900">
              {loading ? "-" : score}
            </div>
            <div className="mb-1 text-sm font-bold text-slate-500">点</div>
            <div className="ml-2 text-3xl">🌱</div>
            <div className="ml-1 rounded-full bg-green-200/50 px-3 py-1 text-sm font-bold text-green-800">
              {rank}
            </div>
          </div>

          <div className="mt-4 flex gap-6 text-sm font-bold text-slate-700">
            <div>
              取引実績 <span className="text-slate-900">{completedTransactions}件</span>
            </div>
            <div>
              完了率 <span className="text-slate-900">{completionRate}%</span>
            </div>
          </div>

          <div className="relative mt-8">
            <div className="h-1 w-full rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-green-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="absolute top-1/2 -mt-2 flex w-full justify-between px-1 text-xs font-bold">
              <div className="-ml-2 flex flex-col items-center">
                <div className="mb-1 h-3 w-0.5 bg-green-500" />
                <span className="text-slate-900">100</span>
                <span className="mt-1 font-normal text-green-600">レギュラー</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="mb-1 h-3 w-0.5 bg-slate-300" />
                <span className="text-slate-900">120</span>
                <span className="mt-1 font-normal text-green-600">トラスト</span>
              </div>
              <div className="-mr-2 flex flex-col items-center">
                <div className="mb-1 h-3 w-0.5 bg-slate-300" />
                <span className="text-slate-900">150</span>
                <span className="mt-1 font-normal text-slate-500">エキスパート</span>
              </div>
            </div>
          </div>
          <div className="h-8" />
        </div>
      </section>

      <section className="mt-2 bg-white">
        <h3 className="border-b border-slate-100 px-4 py-3 text-xs font-bold text-slate-900">
          スコアの内訳
        </h3>
        <div className="divide-y divide-slate-100">
          <ScoreRow
            icon="✓"
            title="取引の完了率"
            description="取引を最後まで完了した割合"
            value={`${completionRate}%`}
          />
          <ScoreRow
            icon="👍"
            title="良かった評価の割合"
            description="評価機能の集計に合わせて更新予定"
            value="-"
          />
          <ScoreRow
            icon="📄"
            title="取引件数"
            description="これまでに関わった取引件数"
            value={`${totalTransactions}件`}
          />
        </div>
      </section>

      <section className="mt-6 px-4">
        <div className="rounded-lg bg-blue-50 p-4 text-blue-900">
          <div className="mb-1 flex items-center gap-2">
            <span className="grid size-4 place-items-center rounded-full border border-blue-500 text-[10px] font-bold text-blue-500">i</span>
            <span className="text-xs font-bold">スコアを上げるコツ</span>
          </div>
          <p className="text-xs leading-relaxed text-blue-800/80">
            取引を丁寧に完了し、良い評価を積み重ねることでスコアが上がります。
          </p>
        </div>
        <p className="mt-3 text-center text-[10px] text-slate-400">
          ※ スコアは取引・評価・キャンセル履歴に応じて更新されます
        </p>
      </section>
    </main>
  );
}

function ScoreRow({
  icon,
  title,
  description,
  value,
}: {
  icon: string;
  title: string;
  description: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-full bg-green-50 text-lg text-green-500">
          <span>{icon}</span>
        </div>
        <div>
          <div className="text-sm font-bold text-slate-900">{title}</div>
          <div className="text-xs text-slate-500">{description}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-black text-green-600">{value}</span>
        <span className="text-slate-400">&gt;</span>
      </div>
    </div>
  );
}
