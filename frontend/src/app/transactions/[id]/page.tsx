"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { MOCK_AUTH_ENABLED, MOCK_USER_ID } from "@/lib/auth/mock";
import { getItem, type Item } from "@/lib/items/api";
import { mockStore, type MockLocation } from "@/lib/mockStore";
import {
  getPriceOffers,
  respondPriceOffer,
  sendPriceOffer,
  type PriceOffer,
} from "@/lib/priceOffers/api";
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

type NextActionTone = "blue" | "green" | "amber" | "red" | "slate";

type NextActionCommand =
  | "accept-price"
  | "evaluate"
  | "message"
  | "price"
  | "reject-price"
  | "review-action"
  | "schedule";

type NextActionButton = {
  label: string;
  command: NextActionCommand;
  variant: "primary" | "secondary" | "danger";
};

type NextAction = {
  title: string;
  description: string;
  badge: string;
  tone: NextActionTone;
  primary?: NextActionButton;
  secondary?: NextActionButton;
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
  const [priceOffers, setPriceOffers] = useState<PriceOffer[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [locations, setLocations] = useState<MockLocation[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showPriceOfferModal, setShowPriceOfferModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [offerPrice, setOfferPrice] = useState("");
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
      const [nextItem, nextProposals, nextPriceOffers] = await Promise.all([
        getItem(nextTransaction.item_id),
        nextTransaction.status === "proposing"
          ? getScheduleProposals(nextTransaction.id).catch(() => [])
          : Promise.resolve([]),
        getPriceOffers(nextTransaction.id).catch(() => []),
      ]);

      const nextMessages =
        nextTransaction.status === "scheduled"
          ? await getTransactionMessages(nextTransaction.id)
          : [];

      setTransaction(nextTransaction);
      setItem(nextItem);
      setProposals(nextProposals);
      setPriceOffers(nextPriceOffers);
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
  const pendingPriceOffer = priceOffers.find((offer) => offer.status === "pending") ?? null;
  const pendingProposal = pendingProposals[0] ?? null;
  const pendingPriceOfferIsMine = Boolean(
    pendingPriceOffer && currentUserId && pendingPriceOffer.sender_id === currentUserId,
  );
  const pendingProposalIsMine = Boolean(
    pendingProposal &&
      currentUserId &&
      (pendingProposal.sender_id === currentUserId || (MOCK_AUTH_ENABLED && currentUserId === MOCK_USER_ID)),
  );
  const canChat = transaction?.status === "scheduled";
  const isClosed = transaction?.status === "completed" || transaction?.status === "canceled";
  const isSeller = Boolean(transaction && currentUserId && transaction.seller_id === currentUserId);
  const canSendPriceOffer = Boolean(
    transaction?.status === "proposing" && !pendingPriceOffer && priceOffers.length < 3,
  );
  const hasEvaluated = Boolean(
    transaction && currentUserId && (isSeller ? transaction.seller_evaluated : transaction.buyer_evaluated),
  );
  const counterpartHasEvaluated = Boolean(
    transaction && currentUserId && (isSeller ? transaction.buyer_evaluated : transaction.seller_evaluated),
  );
  const partnerLabel = isSeller ? "購入希望者" : "出品者";
  const nextAction = transaction
    ? buildNextAction({
        transaction,
        pendingPriceOffer,
        pendingPriceOfferIsMine,
        pendingProposal,
        pendingProposalIsMine,
        priceOfferCount: priceOffers.length,
        hasEvaluated,
        counterpartHasEvaluated,
      })
    : null;
  const footerAction = nextAction ? buildFooterAction(nextAction, transaction?.status) : null;

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
      if (pendingPriceOffer) {
        setError("未回答の価格提案があります。価格提案への回答後に日程を提案してください");
        return;
      }
      setShowScheduleModal(true);
      return;
    }

    if (action === "price") {
      if (transaction.status !== "proposing") {
        setError("価格交渉は日程確定前の取引でのみ行えます");
        return;
      }
      if (!canSendPriceOffer) {
        setError(
          pendingPriceOffer
            ? "未回答の価格提案があります"
            : "この取引での価格交渉回数の上限（3回）に達しました",
        );
        return;
      }
      setOfferPrice(String(transaction.final_price ?? item.price));
      setShowPriceOfferModal(true);
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

  function handleNextAction(command: NextActionCommand) {
    if (command === "review-action") {
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (command === "accept-price" || command === "reject-price") {
      if (!pendingPriceOffer) return;
      void handlePriceOfferResponse(
        pendingPriceOffer.id,
        command === "accept-price" ? "accepted" : "rejected",
      );
      return;
    }
    if (command === "message") {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      return;
    }
    void handleAction(command);
  }

  async function submitPriceOffer() {
    if (!transaction || isSubmitting) return;

    const parsedPrice = Number(offerPrice);
    if (!Number.isInteger(parsedPrice) || parsedPrice < 0) {
      setError("価格は0以上の整数で入力してください");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await sendPriceOffer(transaction, parsedPrice);
      setShowPriceOfferModal(false);
      setOfferPrice("");
      await loadData();
    } catch (priceError) {
      setError(priceError instanceof Error ? priceError.message : "価格提案の送信に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePriceOfferResponse(offerId: string, status: "accepted" | "rejected") {
    if (!transaction || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await respondPriceOffer(transaction, offerId, status);
      await loadData();
    } catch (priceError) {
      setError(priceError instanceof Error ? priceError.message : "価格提案への回答に失敗しました");
    } finally {
      setIsSubmitting(false);
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

        {nextAction && (
          <NextActionCard action={nextAction} onAction={handleNextAction} isSubmitting={isSubmitting} />
        )}

        {transaction.meeting_datetime && transaction.meeting_place && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
            <div className="font-bold">受け渡し予定</div>
            <div>{new Date(transaction.meeting_datetime).toLocaleString("ja-JP")}</div>
            <div>{transaction.meeting_place}</div>
          </div>
        )}

        {(transaction.status === "proposing" || priceOffers.length > 0) && (
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-bold text-slate-900">価格交渉</div>
                <div className="mt-1 text-xs leading-relaxed text-slate-500">
                  {transaction.final_price !== null
                    ? `${formatPrice(transaction.final_price)}で合意済みです。`
                    : pendingPriceOffer
                      ? "未回答の価格提案があります。回答後に次の提案ができます。"
                      : "最大3回まで価格提案できます。"}
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                {priceOffers.length}/3回
              </span>
            </div>

            {priceOffers.length > 0 && (
              <ul className="mt-3 space-y-2">
                {priceOffers.map((offer) => {
                  const isMine = offer.sender_id === currentUserId;
                  const canRespond = !isMine && offer.status === "pending" && transaction.status === "proposing";
                  return (
                    <li key={offer.id} className="rounded-md border border-slate-100 bg-slate-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-bold text-slate-500">
                            {offer.offer_count}回目 / {isMine ? "あなたの提案" : `${partnerLabel}からの提案`}
                          </div>
                          <div className="mt-1 text-lg font-black text-slate-900">
                            {formatPrice(offer.price)}
                          </div>
                        </div>
                        <PriceOfferBadge status={offer.status} />
                      </div>
                      {canRespond && (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handlePriceOfferResponse(offer.id, "rejected")}
                            disabled={isSubmitting}
                            className="rounded-full bg-slate-100 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"
                          >
                            見送る
                          </button>
                          <button
                            onClick={() => handlePriceOfferResponse(offer.id, "accepted")}
                            disabled={isSubmitting}
                            className="rounded-full bg-[#0047c7] py-2 text-xs font-bold text-white disabled:opacity-50"
                          >
                            承認する
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {transaction.status === "proposing" && canSendPriceOffer && (
              <button
                onClick={() => {
                  setOfferPrice(String(transaction.final_price ?? item.price));
                  setShowPriceOfferModal(true);
                }}
                disabled={isSubmitting}
                className="mt-3 w-full rounded-full bg-[#0047c7] py-2.5 text-xs font-bold text-white shadow-sm disabled:opacity-50"
              >
                価格を提案する
              </button>
            )}
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
            <ActionButton
              label="日程提案"
              icon="📅"
              onClick={() => handleAction("schedule")}
              disabled={Boolean(pendingPriceOffer)}
            />
            <ActionButton label="価格交渉" icon="¥" onClick={() => handleAction("price")} />
            <ActionButton label="キャンセル" icon="✕" onClick={() => handleAction("cancel")} />
            <ActionButton label={hasEvaluated ? "評価済み" : "完了"} icon="✓" onClick={() => handleAction("evaluate")} />
          </div>
        </div>
      )}

      {showPriceOfferModal && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="w-full max-w-[430px] rounded-t-2xl bg-white">
            <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-bold text-slate-900">価格を提案</h2>
              <button
                onClick={() => setShowPriceOfferModal(false)}
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
                価格提案は1取引につき最大3回までです。未回答の提案がある間は次の提案はできません。
              </div>

              <label className="block text-xs font-bold text-slate-600">
                提案価格
                <div className="mt-2 flex items-center rounded-lg border border-slate-300 bg-white px-3 focus-within:border-[#0047c7]">
                  <span className="text-sm font-bold text-slate-500">¥</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    value={offerPrice}
                    onChange={(event) => setOfferPrice(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent px-2 py-3 text-lg font-black text-slate-900 outline-none"
                    placeholder="例: 300"
                    disabled={isSubmitting}
                  />
                </div>
              </label>
            </div>

            <div className="flex gap-2 border-t border-slate-100 p-4">
              <button
                onClick={() => setShowPriceOfferModal(false)}
                disabled={isSubmitting}
                className="flex-1 rounded-full bg-slate-100 py-3 text-sm font-bold text-slate-700 disabled:opacity-50"
              >
                戻る
              </button>
              <button
                onClick={submitPriceOffer}
                disabled={isSubmitting || offerPrice.trim() === ""}
                className="flex-1 rounded-full bg-[#0047c7] py-3 text-sm font-bold text-white shadow-sm disabled:opacity-50"
              >
                提案する
              </button>
            </div>
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
              onClick={() => {
                if (footerAction) {
                  handleNextAction(footerAction.command);
                  return;
                }
                void handleAction("schedule");
              }}
              disabled={isSubmitting || isClosed || !footerAction}
              className="flex-1 rounded-full bg-[#0047c7] py-3 text-sm font-bold text-white shadow-sm disabled:opacity-50"
            >
              {footerAction?.label ?? "取引は終了しています"}
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
  disabled = false,
}: {
  label: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-1 disabled:opacity-40"
    >
      <div className="grid size-12 place-items-center rounded-full bg-blue-50 text-xl font-bold text-[#0047c7]">
        {icon}
      </div>
      <span className="text-[10px] font-bold text-slate-700">{label}</span>
    </button>
  );
}

function NextActionCard({
  action,
  onAction,
  isSubmitting,
}: {
  action: NextAction;
  onAction: (command: NextActionCommand) => void;
  isSubmitting: boolean;
}) {
  const tone = {
    blue: "border-blue-100 bg-blue-50 text-blue-950",
    green: "border-green-100 bg-green-50 text-green-950",
    amber: "border-amber-100 bg-amber-50 text-amber-950",
    red: "border-red-100 bg-red-50 text-red-950",
    slate: "border-slate-200 bg-white text-slate-900",
  }[action.tone];

  return (
    <section className={`rounded-lg border p-3 text-sm shadow-sm ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-black opacity-70">次にやること</div>
          <h2 className="mt-1 text-base font-black">{action.title}</h2>
          <p className="mt-1 text-xs leading-relaxed opacity-80">{action.description}</p>
        </div>
        <span className="shrink-0 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-black">
          {action.badge}
        </span>
      </div>

      {(action.primary || action.secondary) && (
        <div className="mt-3 flex gap-2">
          {action.secondary && (
            <NextActionCardButton
              button={action.secondary}
              onAction={onAction}
              isSubmitting={isSubmitting}
            />
          )}
          {action.primary && (
            <NextActionCardButton
              button={action.primary}
              onAction={onAction}
              isSubmitting={isSubmitting}
            />
          )}
        </div>
      )}
    </section>
  );
}

function NextActionCardButton({
  button,
  onAction,
  isSubmitting,
}: {
  button: NextActionButton;
  onAction: (command: NextActionCommand) => void;
  isSubmitting: boolean;
}) {
  const className = {
    primary: "bg-[#0047c7] text-white",
    secondary: "bg-white text-slate-700",
    danger: "bg-red-600 text-white",
  }[button.variant];

  return (
    <button
      onClick={() => onAction(button.command)}
      disabled={isSubmitting}
      className={`flex-1 rounded-full px-3 py-2.5 text-xs font-black shadow-sm disabled:opacity-50 ${className}`}
    >
      {button.label}
    </button>
  );
}

function PriceOfferBadge({ status }: { status: PriceOffer["status"] }) {
  const badge = {
    pending: { label: "回答待ち", className: "bg-blue-50 text-blue-700" },
    accepted: { label: "承認済み", className: "bg-green-50 text-green-700" },
    rejected: { label: "見送り", className: "bg-slate-100 text-slate-600" },
  }[status];

  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${badge.className}`}>
      {badge.label}
    </span>
  );
}

function formatPrice(price: number): string {
  return price === 0 ? "0円" : `${price.toLocaleString("ja-JP")}円`;
}

function buildFooterAction(
  action: NextAction,
  status: Transaction["status"] | undefined,
): NextActionButton | null {
  if (status === "completed" || status === "canceled") {
    return null;
  }
  if (action.primary?.command === "accept-price" || action.primary?.command === "reject-price") {
    return { label: "価格提案を確認する", command: "review-action", variant: "primary" };
  }
  if (action.primary) {
    return action.primary;
  }
  if (status === "proposing" && action.badge === "価格待ち") {
    return { label: "価格回答待ちです", command: "review-action", variant: "primary" };
  }
  if (status === "proposing" && action.badge === "日程待ち") {
    return { label: "日程回答待ちです", command: "review-action", variant: "primary" };
  }
  if (status === "proposing" && action.badge === "要回答") {
    return { label: "日程候補を確認する", command: "review-action", variant: "primary" };
  }
  if (status === "proposing") {
    return { label: "日程を提案する", command: "schedule", variant: "primary" };
  }
  return null;
}

function buildNextAction({
  transaction,
  pendingPriceOffer,
  pendingPriceOfferIsMine,
  pendingProposal,
  pendingProposalIsMine,
  priceOfferCount,
  hasEvaluated,
  counterpartHasEvaluated,
}: {
  transaction: Transaction;
  pendingPriceOffer: PriceOffer | null;
  pendingPriceOfferIsMine: boolean;
  pendingProposal: ScheduleProposal | null;
  pendingProposalIsMine: boolean;
  priceOfferCount: number;
  hasEvaluated: boolean;
  counterpartHasEvaluated: boolean;
}): NextAction {
  if (transaction.status === "canceled") {
    return {
      title: "この取引はキャンセル済みです",
      description: "出品は再公開され、これ以上の取引操作はできません。必要ならヘルプ・サポートから相談できます。",
      badge: "終了",
      tone: "red",
    };
  }

  if (transaction.status === "completed") {
    return {
      title: "取引は完了しています",
      description: "双方の評価が揃い、信用スコアへの反映まで完了しています。",
      badge: "完了",
      tone: "green",
    };
  }

  if (transaction.status === "scheduled") {
    if (!hasEvaluated) {
      return {
        title: "受け渡し後に評価してください",
        description: "受け渡しが終わったら相手を評価すると、取引完了へ進めます。連絡が必要なら下のメッセージを使えます。",
        badge: "評価待ち",
        tone: "blue",
        primary: { label: "評価して完了へ進む", command: "evaluate", variant: "primary" },
        secondary: { label: "メッセージする", command: "message", variant: "secondary" },
      };
    }

    if (!counterpartHasEvaluated) {
      return {
        title: "相手の評価待ちです",
        description: "あなたの評価は送信済みです。相手の評価が完了すると取引完了になります。",
        badge: "相手待ち",
        tone: "amber",
        primary: { label: "メッセージする", command: "message", variant: "primary" },
      };
    }

    return {
      title: "取引完了を反映中です",
      description: "双方の評価が揃っています。画面を再読み込みすると完了状態に更新されます。",
      badge: "反映中",
      tone: "green",
    };
  }

  if (pendingPriceOffer) {
    if (pendingPriceOfferIsMine) {
      return {
        title: "価格提案の回答待ちです",
        description: `${formatPrice(pendingPriceOffer.price)}で提案中です。相手が承認または見送りするまで、日程提案は待ちましょう。`,
        badge: "価格待ち",
        tone: "amber",
      };
    }

    return {
      title: "価格提案に回答してください",
      description: `相手から${formatPrice(pendingPriceOffer.price)}の提案が届いています。承認するとこの価格で確定します。`,
      badge: "要回答",
      tone: "blue",
      primary: { label: "承認する", command: "accept-price", variant: "primary" },
      secondary: { label: "見送る", command: "reject-price", variant: "secondary" },
    };
  }

  if (pendingProposal) {
    if (pendingProposalIsMine) {
      return {
        title: "日程提案の回答待ちです",
        description: "相手が候補から1つ選ぶと受け渡し予定が確定し、メッセージを送れるようになります。",
        badge: "日程待ち",
        tone: "amber",
      };
    }

    return {
      title: "日程候補を確認してください",
      description: "相手から日程候補が届いています。下の日程提案カードから都合のよい候補を選んでください。",
      badge: "要回答",
      tone: "blue",
    };
  }

  if (transaction.final_price !== null) {
    return {
      title: "価格は確定済みです",
      description: `${formatPrice(transaction.final_price)}で合意済みです。次は受け渡しの日程と場所を提案してください。`,
      badge: "日程へ",
      tone: "green",
      primary: { label: "日程を提案する", command: "schedule", variant: "primary" },
    };
  }

  if (priceOfferCount >= 3) {
    return {
      title: "価格交渉の上限に達しました",
      description: "この取引での価格提案は3回までです。現在の価格で進める場合は日程を提案してください。",
      badge: "3/3回",
      tone: "amber",
      primary: { label: "日程を提案する", command: "schedule", variant: "primary" },
    };
  }

  return {
    title: "価格か日程を決めましょう",
    description: "価格を相談したい場合は価格提案へ、表示価格のまま進める場合は日程提案へ進めます。",
    badge: "調整中",
    tone: "slate",
    primary: { label: "日程を提案する", command: "schedule", variant: "primary" },
    secondary: { label: "価格を提案する", command: "price", variant: "secondary" },
  };
}
