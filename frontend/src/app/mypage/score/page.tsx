"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyEvaluations, type EvaluationType, type ReceivedEvaluation } from "@/lib/evaluations/api";
import { getTransactions, type Transaction } from "@/lib/transactions/api";
import { getMyProfile, type UserProfile } from "@/lib/users/api";

export default function CreditScorePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [evaluations, setEvaluations] = useState<ReceivedEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadScore() {
      try {
        setLoading(true);
        setError(null);
        const [loadedProfile, loadedTransactions, loadedEvaluations] = await Promise.all([
          getMyProfile(),
          getTransactions(),
          getMyEvaluations(),
        ]);
        if (!ignore) {
          setProfile(loadedProfile);
          setTransactions(loadedTransactions);
          setEvaluations(loadedEvaluations);
        }
      } catch (caughtError) {
        if (!ignore) {
          if (caughtError instanceof Error && caughtError.message === "ログインが必要です") {
            router.replace("/login");
            return;
          }
          setError(getScoreErrorMessage(caughtError));
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
  const summary = useMemo(() => summarizeEvaluations(evaluations), [evaluations]);
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
        <section className="m-4 rounded-lg bg-red-50 px-3 py-3">
          <p className="text-xs font-bold leading-5 text-red-600">{error}</p>
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
              取引実績 <span className="text-slate-900">{loading ? "-" : `${completedTransactions}件`}</span>
            </div>
            <div>
              完了率 <span className="text-slate-900">{loading ? "-" : `${completionRate}%`}</span>
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
            value={loading ? "-" : `${completionRate}%`}
          />
          <ScoreRow
            icon="👍"
            title="良かった評価の割合"
            description="受け取った相互評価のうち good の割合"
            value={loading ? "-" : `${summary.goodRate}%`}
          />
          <ScoreRow
            icon="!"
            title="ペナルティ"
            description="キャンセル・無断キャンセルの記録"
            value={loading ? "-" : `${summary.penaltyCount}件`}
          />
        </div>
      </section>

      <section className="mt-3 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="text-xs font-bold text-slate-900">評価履歴</h3>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">
            {loading ? "-" : `${evaluations.length}件`}
          </span>
        </div>
        <div className="px-4 py-3">
          {loading ? (
            <div className="space-y-2">
              <div className="h-14 rounded-md bg-slate-100" />
              <div className="h-14 rounded-md bg-slate-50" />
            </div>
          ) : evaluations.length > 0 ? (
            <ul className="space-y-2">
              {evaluations.map((evaluation) => (
                <EvaluationHistoryRow key={evaluation.id} evaluation={evaluation} />
              ))}
            </ul>
          ) : (
            <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-4">
              <p className="text-sm font-bold text-slate-700">まだ評価履歴はありません</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                取引完了後の相互評価やキャンセル履歴がここに表示されます。
              </p>
            </div>
          )}
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

function EvaluationHistoryRow({ evaluation }: { evaluation: ReceivedEvaluation }) {
  const positive = evaluation.score_change > 0;

  return (
    <li className="rounded-md border border-slate-100 bg-white px-3 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <EvaluationTypeBadge type={evaluation.type} />
            <span className="text-xs font-bold text-slate-400">
              {formatDate(evaluation.created_at)}
            </span>
          </div>
          <p className="mt-2 truncate text-sm font-bold text-slate-900">
            {evaluation.item_title ?? "取引した参考書"}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {evaluationDescription(evaluation.type)}
          </p>
        </div>
        <span className={`shrink-0 text-sm font-black ${positive ? "text-green-600" : "text-red-600"}`}>
          {positive ? "+" : ""}
          {evaluation.score_change}
        </span>
      </div>
    </li>
  );
}

function EvaluationTypeBadge({ type }: { type: EvaluationType }) {
  const tone = type === "good" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700";
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-black ${tone}`}>
      {evaluationTypeLabel(type)}
    </span>
  );
}

function summarizeEvaluations(evaluations: ReceivedEvaluation[]) {
  const goodCount = evaluations.filter((evaluation) => evaluation.type === "good").length;
  const badCount = evaluations.filter((evaluation) => evaluation.type === "bad").length;
  const penaltyCount = evaluations.filter(
    (evaluation) => evaluation.type === "cancel" || evaluation.type === "no_show",
  ).length;
  const mutualCount = goodCount + badCount;

  return {
    goodCount,
    badCount,
    penaltyCount,
    goodRate: mutualCount > 0 ? Math.round((goodCount / mutualCount) * 100) : 0,
  };
}

function evaluationTypeLabel(type: EvaluationType): string {
  switch (type) {
    case "good":
      return "良い評価";
    case "bad":
      return "気になる評価";
    case "cancel":
      return "キャンセル";
    case "no_show":
      return "無断キャンセル";
  }
}

function evaluationDescription(type: EvaluationType): string {
  switch (type) {
    case "good":
      return "相手から良い取引として評価されました。";
    case "bad":
      return "取引で気になる点があった評価です。";
    case "cancel":
      return "予定確定後のキャンセルによりスコアへ反映されました。";
    case "no_show":
      return "受け渡し未実施の報告によりスコアへ反映されました。";
  }
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("ja-JP", {
    month: "numeric",
    day: "numeric",
  });
}

function getScoreErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "信用スコアを取得できませんでした";
  }

  if (error.message.includes("タイムアウト") || error.message.includes("fetch")) {
    return "APIに接続できません。backendが起動しているか、NEXT_PUBLIC_API_BASE_URLを確認してください。";
  }

  if (error.message.includes("ログイン") || error.message.includes("認証")) {
    return "ログイン状態を確認してください。再ログインすると解消する場合があります。";
  }

  return error.message || "信用スコアを取得できませんでした";
}
