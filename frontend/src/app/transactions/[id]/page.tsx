"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { MOCK_AUTH_ENABLED, MOCK_USER_ID } from "@/lib/auth/mock";
import { getItem, type Item } from "@/lib/items/api";
import { mockStore, type MockLocation } from "@/lib/mockStore";
import { createClient } from "@/lib/supabase/client";
import {
  executeCancellation,
  getScheduleProposals,
  getTransaction,
  getTransactionMessages,
  respondScheduleProposal,
  sendScheduleProposal,
  sendTransactionMessage,
  submitEvaluation,
  updateTransaction,
  type EvaluationType,
  type ScheduleProposal,
  type Transaction,
  type TransactionMessage,
} from "@/lib/transactions/api";

type Candidate = {
  date: string;
  time: string;
  locationId: string;
};

const STATUS_LABEL: Record<Transaction["status"], string> = {
  proposing: "日程調整中",
  scheduled: "予定決定済",
  completed: "取引完了",
  canceled: "キャンセル",
};

export default function TransactionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const transactionId = params.id;

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [messages, setMessages] = useState<TransactionMessage[]>([]);
  const [proposals, setProposals] = useState<ScheduleProposal[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [locations, setLocations] = useState<MockLocation[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [evaluationType, setEvaluationType] = useState<EvaluationType>("good");
  const [selectedArea, setSelectedArea] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([
    { date: "", time: "", locationId: "" },
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = MOCK_AUTH_ENABLED ? mockStore.currentUser.id : user?.id ?? null;
      setCurrentUserId(userId);
      setLocations(mockStore.getLocations());

      const nextTransaction = await getTransaction(transactionId);
      const [nextItem, nextProposals] = await Promise.all([
        getItem(nextTransaction.item_id),
        nextTransaction.status === "proposing"
          ? getScheduleProposals(nextTransaction.id).catch(() => [])
          : Promise.resolve([]),
      ]);

      const nextMessages =
        nextTransaction.status === "scheduled"
          ? await getTransactionMessages(nextTransaction.id)
          : [];

      setTransaction(nextTransaction);
      setItem(nextItem);
      setProposals(nextProposals);
      setMessages(nextMessages);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "取引情報の取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, [transactionId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadData]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const areas = useMemo(
    () => Array.from(new Set(locations.map((location) => location.area))),
    [locations],
  );

  const pendingProposals = proposals.filter((proposal) => proposal.status === "pending");
  const canChat = transaction?.status === "scheduled";
  const isClosed = transaction?.status === "completed" || transaction?.status === "canceled";
  const isSeller = Boolean(transaction && currentUserId && transaction.seller_id === currentUserId);
  const hasEvaluated = Boolean(
    transaction && currentUserId && (isSeller ? transaction.seller_evaluated : transaction.buyer_evaluated),
  );
  const counterpartHasEvaluated = Boolean(
    transaction && currentUserId && (isSeller ? transaction.buyer_evaluated : transaction.seller_evaluated),
  );
  const partnerLabel = isSeller ? "購入希望者" : "出品者";

  async function handleSend() {
    const content = text.trim();
    if (!transaction || !content || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const message = await sendTransactionMessage(transaction.id, content);
      setMessages((prev) => [...prev, message]);
      setText("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "メッセージ送信に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAction(action: string) {
    if (!transaction || !item || isSubmitting) return;
    setShowMenu(false);
    setError(null);

    if (action === "schedule") {
      setShowScheduleModal(true);
      return;
    }

    if (action === "price") {
      const price = window.prompt("希望の金額を入力してください (例: 200)");
      if (!price) return;
      const parsedPrice = Number(price);
      if (!Number.isInteger(parsedPrice) || parsedPrice < 0) {
        setError("価格は0以上の整数で入力してください");
        return;
      }
      setIsSubmitting(true);
      try {
        await updateTransaction(transaction.id, { final_price: parsedPrice });
        await loadData();
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "価格更新に失敗しました");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (action === "evaluate") {
      if (transaction.status !== "scheduled") {
        setError("日程確定後に取引完了できます");
        return;
      }
      if (hasEvaluated) {
        setError("あなたの評価は送信済みです。相手の評価が完了すると取引が完了します");
        return;
      }
      setEvaluationType("good");
      setShowEvaluationModal(true);
      return;
    }

    if (action === "cancel") {
      setShowCancelModal(true);
    }
  }

  async function submitCancellation() {
    if (!transaction || isSubmitting) return;

    const normalizedReason = cancelReason.trim();
    setIsSubmitting(true);
    setError(null);
    try {
      await executeCancellation(transaction, normalizedReason || undefined);
      setShowCancelModal(false);
      setCancelReason("");
      await loadData();
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "キャンセル実行に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitTransactionEvaluation() {
    if (!transaction || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await submitEvaluation(transaction, evaluationType);
      setShowEvaluationModal(false);
      await loadData();
    } catch (evaluationError) {
      setError(evaluationError instanceof Error ? evaluationError.message : "評価の送信に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  }

  function addCandidate() {
    if (candidates.length >= 5) return;
    setCandidates([...candidates, { date: "", time: "", locationId: "" }]);
  }

  function updateCandidate(index: number, field: keyof Candidate, value: string) {
    const nextCandidates = [...candidates];
    nextCandidates[index] = { ...nextCandidates[index], [field]: value };
    setCandidates(nextCandidates);
  }

  async function submitSchedule() {
    if (!transaction || isSubmitting) return;
    const validCandidates = candidates
      .map((candidate) => {
        const location = locations.find((loc) => loc.id === candidate.locationId);
        if (!candidate.date || !candidate.time || !location) return null;
        return {
          proposed_datetime: new Date(`${candidate.date}T${candidate.time}:00+09:00`).toISOString(),
          proposed_place: `${location.area} - ${location.name}`,
        };
      })
      .filter((candidate): candidate is { proposed_datetime: string; proposed_place: string } =>
        Boolean(candidate),
      );

    if (validCandidates.length === 0) {
      setError("少なくとも1つの候補を完全に入力してください");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await sendScheduleProposal({
        transaction_id: transaction.id,
        candidates: validCandidates,
      });
      setShowScheduleModal(false);
      setCandidates([{ date: "", time: "", locationId: "" }]);
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "日程提案の送信に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleProposalResponse(proposalId: string, candidateId: string) {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await respondScheduleProposal(proposalId, { status: "accepted", candidate_id: candidateId });
      await loadData();
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : "日程提案への回答に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <div className="p-10 text-center text-sm text-slate-500">Loading...</div>;
  }

  if (!transaction || !item) {
    return (
      <main className="mx-auto min-h-dvh max-w-[430px] bg-white p-6">
        <button onClick={() => router.back()} className="mb-6 text-sm font-bold text-slate-600">
          &lt; 戻る
        </button>
        <div className="rounded-lg bg-red-50 p-4 text-sm font-bold text-red-700">
          {error ?? "取引が見つかりません"}
        </div>
      </main>
    );
  }

  return (
    <main className="relative mx-auto flex h-dvh max-w-[430px] flex-col bg-[#f5f7fb]">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center border-b border-slate-200 bg-white px-4 shadow-sm">
        <button onClick={() => router.back()} className="text-xl font-bold text-slate-700">
          &lt;
        </button>
        <div className="ml-4 flex min-w-0 flex-1 flex-col">
          <h1 className="truncate text-sm font-black text-slate-900">{partnerLabel}</h1>
          <div className="truncate text-[10px] text-slate-500">
            {item.title} (ステータス:{" "}
            <span className="font-bold text-blue-600">{STATUS_LABEL[transaction.status]}</span>)
            {transaction.final_price !== null && ` - 最終価格: ¥${transaction.final_price}`}
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>
        )}

        <div className="mx-auto rounded-full bg-slate-200 px-3 py-1 text-xs text-slate-500">
          取引が開始されました。日程を確定するとメッセージを送れます。
        </div>

        {transaction.meeting_datetime && transaction.meeting_place && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
            <div className="font-bold">受け渡し予定</div>
            <div>{new Date(transaction.meeting_datetime).toLocaleString("ja-JP")}</div>
            <div>{transaction.meeting_place}</div>
          </div>
        )}

        {(transaction.status === "scheduled" || transaction.status === "completed") && (
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-bold text-slate-900">取引評価</div>
                <div className="mt-1 text-xs leading-relaxed text-slate-500">
                  {transaction.status === "completed"
                    ? "双方の評価が完了しました。信用スコアに反映されています。"
                    : hasEvaluated
                      ? "あなたの評価は送信済みです。相手の評価が完了すると取引完了になります。"
                      : "受け渡しが終わったら、相手を評価して取引完了に進めます。"}
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                {transaction.status === "completed"
                  ? "完了"
                  : hasEvaluated
                    ? counterpartHasEvaluated
                      ? "反映中"
                      : "相手待ち"
                    : "未評価"}
              </span>
            </div>
            {transaction.status === "scheduled" && !hasEvaluated && (
              <button
                onClick={() => {
                  setEvaluationType("good");
                  setShowEvaluationModal(true);
                }}
                disabled={isSubmitting}
                className="mt-3 w-full rounded-full bg-[#0047c7] py-2.5 text-xs font-bold text-white shadow-sm disabled:opacity-50"
              >
                評価して完了へ進む
              </button>
            )}
          </div>
        )}

        {pendingProposals.map((proposal) => {
          const isMine = proposal.sender_id === currentUserId || (MOCK_AUTH_ENABLED && currentUserId === MOCK_USER_ID);
          return (
            <div
              key={proposal.id}
              className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900 shadow-sm"
            >
              <div className="mb-2 font-bold">日程提案</div>
              <div className="space-y-2">
                {proposal.candidates.map((candidate) => (
                  <div key={candidate.id} className="rounded bg-white p-2">
                    <div>{new Date(candidate.proposed_datetime).toLocaleString("ja-JP")}</div>
                    <div className="text-xs text-slate-600">{candidate.proposed_place}</div>
                    {!isMine && (
                      <button
                        onClick={() => handleProposalResponse(proposal.id, candidate.id)}
                        disabled={isSubmitting}
                        className="mt-2 rounded-full bg-[#0047c7] px-3 py-1 text-xs font-bold text-white disabled:opacity-50"
                      >
                        この候補で確定
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {isMine && <div className="mt-2 text-xs text-slate-500">相手の回答待ちです。</div>}
            </div>
          );
        })}

        {messages.map((message) => {
          const isMe = message.sender_id === currentUserId;
          return (
            <div
              key={message.id}
              className={`flex max-w-[80%] flex-col ${isMe ? "self-end" : "self-start"}`}
            >
              <div
                className={`rounded-2xl px-4 py-2 text-sm shadow-sm ${
                  isMe ? "rounded-tr-sm bg-[#0047c7] text-white" : "rounded-tl-sm bg-white text-slate-900"
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
              <span className={`mt-1 text-[10px] text-slate-400 ${isMe ? "text-right" : "text-left"}`}>
                {new Date(message.created_at).toLocaleTimeString("ja-JP", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          );
        })}

        {canChat && messages.length === 0 && (
          <div className="py-8 text-center text-sm text-slate-500">
            日程が確定しました。受け渡し前の確認メッセージを送れます。
          </div>
        )}
      </div>

      {showMenu && (
        <div className="absolute bottom-20 left-0 right-0 z-20 mx-auto max-w-[430px] rounded-t-2xl border-t border-slate-100 bg-white px-4 py-4 shadow-[0_-10px_20px_rgba(0,0,0,0.1)]">
          <h3 className="mb-3 text-xs font-bold text-slate-500">取引アクション</h3>
          <div className="grid grid-cols-4 gap-2">
            <ActionButton label="日程提案" icon="📅" onClick={() => handleAction("schedule")} />
            <ActionButton label="価格交渉" icon="¥" onClick={() => handleAction("price")} />
            <ActionButton label="キャンセル" icon="✕" onClick={() => handleAction("cancel")} />
            <ActionButton label={hasEvaluated ? "評価済み" : "完了"} icon="✓" onClick={() => handleAction("evaluate")} />
          </div>
        </div>
      )}

      <footer className="z-10 shrink-0 border-t border-slate-200 bg-white px-4 py-3">
        {canChat ? (
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={1}
              maxLength={1000}
              placeholder="メッセージを入力"
              className="min-h-11 flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#0047c7] focus:bg-white"
              disabled={isSubmitting || isClosed}
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || isSubmitting || isClosed}
              className="h-11 shrink-0 rounded-full bg-[#0047c7] px-4 text-sm font-bold text-white shadow-sm disabled:opacity-50"
            >
              送信
            </button>
            <button
              onClick={() => setShowMenu(!showMenu)}
              disabled={isSubmitting || isClosed}
              className="grid size-11 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-50"
            >
              ...
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => handleAction("schedule")}
              disabled={isSubmitting || isClosed}
              className="flex-1 rounded-full bg-[#0047c7] py-3 text-sm font-bold text-white shadow-sm disabled:opacity-50"
            >
              日程を提案する
            </button>
            <button
              onClick={() => setShowMenu(!showMenu)}
              disabled={isSubmitting || isClosed}
              className="grid size-12 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-50"
            >
              ...
            </button>
          </div>
        )}
      </footer>

      {showScheduleModal && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="flex h-[85vh] w-full max-w-[430px] flex-col rounded-t-2xl bg-white">
            <header className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-bold text-slate-900">日程と場所の提案</h2>
              <button onClick={() => setShowScheduleModal(false)} className="text-2xl leading-none text-slate-400">
                &times;
              </button>
            </header>

            <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
              <div className="text-xs text-slate-600">
                最大5つまで候補を提案できます。相手がその中から1つを選ぶと確定します。
              </div>

              {candidates.map((candidate, index) => {
                const selectedLocation = locations.find((loc) => loc.id === candidate.locationId);
                return (
                  <div key={index} className="relative rounded-lg border border-slate-200 bg-slate-50 p-3">
                    {candidates.length > 1 && (
                      <button
                        onClick={() => setCandidates(candidates.filter((_, i) => i !== index))}
                        className="absolute right-2 top-2 text-xs text-slate-400"
                      >
                        削除
                      </button>
                    )}
                    <h3 className="mb-3 text-sm font-bold text-slate-700">候補 {index + 1}</h3>

                    <div className="mb-3 grid grid-cols-2 gap-3">
                      <label className="block text-xs font-bold text-slate-500">
                        日付
                        <input
                          type="date"
                          value={candidate.date}
                          onChange={(event) => updateCandidate(index, "date", event.target.value)}
                          className="mt-1 w-full rounded border border-slate-300 bg-white p-1.5 text-sm"
                        />
                      </label>
                      <label className="block text-xs font-bold text-slate-500">
                        時間
                        <select
                          value={candidate.time}
                          onChange={(event) => updateCandidate(index, "time", event.target.value)}
                          className="mt-1 w-full rounded border border-slate-300 bg-white p-1.5 text-sm"
                        >
                          <option value="">選択</option>
                          {["12:00", "12:15", "12:30", "12:45", "16:30", "17:00", "18:00"].map((time) => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="mb-3">
                      <label className="mb-1 block text-xs font-bold text-slate-500">場所 (エリア)</label>
                      <select
                        value={selectedArea}
                        onChange={(event) => setSelectedArea(event.target.value)}
                        className="mb-2 w-full rounded border border-slate-300 bg-white p-1.5 text-sm"
                      >
                        <option value="">エリアを選択</option>
                        {areas.map((area) => (
                          <option key={area} value={area}>
                            {area}
                          </option>
                        ))}
                      </select>

                      <label className="mb-1 block text-xs font-bold text-slate-500">場所 (スポット)</label>
                      <select
                        value={candidate.locationId}
                        onChange={(event) => updateCandidate(index, "locationId", event.target.value)}
                        disabled={!selectedArea}
                        className="w-full rounded border border-slate-300 bg-white p-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        <option value="">スポットを選択</option>
                        {locations
                          .filter((location) => location.area === selectedArea)
                          .map((location) => (
                            <option key={location.id} value={location.id}>
                              {location.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    {selectedLocation && (
                      <div className="mt-2 flex overflow-hidden rounded border border-slate-200 bg-white">
                        <Image
                          src={selectedLocation.imageUrl}
                          alt={selectedLocation.name}
                          width={96}
                          height={64}
                          className="h-16 w-24 bg-slate-200 object-cover"
                        />
                        <div className="flex items-center p-2 text-xs leading-tight text-slate-600">
                          この周辺で待ち合わせします。目印を確認してください。
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {candidates.length < 5 && (
                <button
                  onClick={addCandidate}
                  className="rounded-lg border border-dashed border-slate-300 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50"
                >
                  + 候補を追加する
                </button>
              )}
            </div>

            <div className="shrink-0 border-t border-slate-100 p-4">
              <button
                onClick={submitSchedule}
                disabled={isSubmitting}
                className="w-full rounded-full bg-[#0047c7] py-3 text-sm font-bold text-white shadow-md disabled:opacity-50"
              >
                提案を送信する
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelModal && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="w-full max-w-[430px] rounded-t-2xl bg-white">
            <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-bold text-slate-900">取引をキャンセル</h2>
              <button
                onClick={() => setShowCancelModal(false)}
                className="text-2xl leading-none text-slate-400"
                disabled={isSubmitting}
              >
                &times;
              </button>
            </header>

            <div className="space-y-4 p-4">
              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-xs font-bold text-red-700">
                  {error}
                </div>
              )}

              <div className="rounded-lg bg-red-50 p-3 text-xs font-bold leading-relaxed text-red-700">
                キャンセルすると取引は中止され、出品は再び公開されます。実行者には信用スコアのペナルティが適用されます。
              </div>

              <label className="block text-xs font-bold text-slate-600">
                理由（任意）
                <textarea
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  rows={4}
                  maxLength={500}
                  placeholder="例: 予定が合わなくなったため"
                  className="mt-2 w-full resize-none rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-[#0047c7]"
                  disabled={isSubmitting}
                />
              </label>
            </div>

            <div className="flex gap-2 border-t border-slate-100 p-4">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={isSubmitting}
                className="flex-1 rounded-full bg-slate-100 py-3 text-sm font-bold text-slate-700 disabled:opacity-50"
              >
                戻る
              </button>
              <button
                onClick={submitCancellation}
                disabled={isSubmitting}
                className="flex-1 rounded-full bg-red-600 py-3 text-sm font-bold text-white shadow-sm disabled:opacity-50"
              >
                キャンセルする
              </button>
            </div>
          </div>
        </div>
      )}

      {showEvaluationModal && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="w-full max-w-[430px] rounded-t-2xl bg-white">
            <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-bold text-slate-900">取引を評価して完了</h2>
              <button
                onClick={() => setShowEvaluationModal(false)}
                className="text-2xl leading-none text-slate-400"
                disabled={isSubmitting}
              >
                &times;
              </button>
            </header>

            <div className="space-y-4 p-4">
              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-xs font-bold text-red-700">
                  {error}
                </div>
              )}

              <div className="rounded-lg bg-blue-50 p-3 text-xs font-bold leading-relaxed text-blue-900">
                評価は相手にはすぐ公開されません。双方の評価が揃うと取引が完了し、信用スコアへ反映されます。
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setEvaluationType("good")}
                  disabled={isSubmitting}
                  className={`rounded-lg border p-4 text-left transition-colors disabled:opacity-50 ${
                    evaluationType === "good"
                      ? "border-[#0047c7] bg-blue-50 text-[#0047c7]"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <div className="text-sm font-black">良かった</div>
                  <div className="mt-1 text-xs leading-relaxed">時間通りで安心して取引できた</div>
                </button>
                <button
                  onClick={() => setEvaluationType("bad")}
                  disabled={isSubmitting}
                  className={`rounded-lg border p-4 text-left transition-colors disabled:opacity-50 ${
                    evaluationType === "bad"
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <div className="text-sm font-black">気になる点あり</div>
                  <div className="mt-1 text-xs leading-relaxed">遅刻や連絡不足などがあった</div>
                </button>
              </div>
            </div>

            <div className="flex gap-2 border-t border-slate-100 p-4">
              <button
                onClick={() => setShowEvaluationModal(false)}
                disabled={isSubmitting}
                className="flex-1 rounded-full bg-slate-100 py-3 text-sm font-bold text-slate-700 disabled:opacity-50"
              >
                戻る
              </button>
              <button
                onClick={submitTransactionEvaluation}
                disabled={isSubmitting}
                className="flex-1 rounded-full bg-[#0047c7] py-3 text-sm font-bold text-white shadow-sm disabled:opacity-50"
              >
                評価を送信
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1">
      <div className="grid size-12 place-items-center rounded-full bg-blue-50 text-xl font-bold text-[#0047c7]">
        {icon}
      </div>
      <span className="text-[10px] font-bold text-slate-700">{label}</span>
    </button>
  );
}
