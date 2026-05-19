"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { mockStore, MockTransaction, MockMessage, MockItem, MockLocation } from "@/lib/mockStore";

type Candidate = {
  date: string;
  time: string;
  locationId: string;
};

export default function TransactionPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [transaction, setTransaction] = useState<MockTransaction | null>(null);
  const [item, setItem] = useState<MockItem | null>(null);
  const [messages, setMessages] = useState<MockMessage[]>([]);
  const [text, setText] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [locations, setLocations] = useState<MockLocation[]>([]);

  // Schedule Candidates State
  const [candidates, setCandidates] = useState<Candidate[]>([
    { date: "", time: "", locationId: "" }
  ]);
  const [selectedArea, setSelectedArea] = useState<string>("");

  const scrollRef = useRef<HTMLDivElement>(null);

  const loadData = () => {
    const tx = mockStore.getTransaction(id);
    if (tx) {
      setTransaction(tx);
      setItem(mockStore.getItem(tx.itemId) || null);
      setMessages(mockStore.getMessages(id));
    }
    setLocations(mockStore.getLocations());
  };

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    if (transaction && transaction.status === "proposing" && messages.length === 0 && !showScheduleModal) {
      // 取引開始直後（メッセージ0件）なら自動的に日程提案を開く
      setShowScheduleModal(true);
    }
  }, [transaction, messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!transaction || !item) return <div className="p-10 text-center">Loading...</div>;

  const isSeller = transaction.sellerId === mockStore.currentUser.id;
  const partnerUser = mockStore.getUser(isSeller ? transaction.buyerId : transaction.sellerId);

  const areas = Array.from(new Set(locations.map(loc => loc.area)));

  const handleSend = () => {
    if (!text.trim()) return;
    mockStore.addMessage(transaction.id, text.trim(), "text");
    setText("");
    loadData();
  };

  const handleAction = (action: string) => {
    setShowMenu(false);
    if (action === "schedule") {
      setShowScheduleModal(true);
    } else if (action === "price") {
      const price = prompt("希望の金額を入力してください (例: 200)");
      if (!price) return;
      mockStore.addMessage(transaction.id, `【価格交渉】\n希望価格: ${price}円`, "system");
      mockStore.updateTransactionPrice(transaction.id, parseInt(price, 10));
      alert("価格交渉を提案し、相手が(自動モックとして)承認しました！価格が更新されます。");
    } else if (action === "cancel") {
      const reason = prompt("キャンセルの理由を入力してください");
      if (!reason) return;
      mockStore.addMessage(transaction.id, `【キャンセル申請】\n理由: ${reason}`, "system");
      mockStore.updateTransactionStatus(transaction.id, "canceled");
      mockStore.updateItemStatus(item.id, "available");
      alert("取引がキャンセルされました。");
    } else if (action === "evaluate") {
      if (transaction.status !== "scheduled" && transaction.status !== "proposing") {
         alert("まだ評価できる段階ではありません");
         return;
      }
      mockStore.addMessage(transaction.id, `【評価】\n${mockStore.currentUser.nickname}さんが評価を完了しました。`, "system");
      mockStore.updateTransactionStatus(transaction.id, "completed");
      mockStore.updateItemStatus(item.id, "completed");
      alert("評価が完了し、取引が終了しました！");
    }
    loadData();
  };

  const addCandidate = () => {
    if (candidates.length >= 5) return;
    setCandidates([...candidates, { date: "", time: "", locationId: "" }]);
  };

  const updateCandidate = (index: number, field: keyof Candidate, value: string) => {
    const newCands = [...candidates];
    newCands[index] = { ...newCands[index], [field]: value };
    setCandidates(newCands);
  };

  const submitSchedule = () => {
    const validCandidates = candidates.filter(c => c.date && c.time && c.locationId);
    if (validCandidates.length === 0) {
      alert("少なくとも1つの候補を完全に入力してください。");
      return;
    }
    
    let msgContent = "【日程提案】\n";
    validCandidates.forEach((c, idx) => {
      const loc = locations.find(l => l.id === c.locationId);
      msgContent += `候補${idx + 1}: ${c.date} ${c.time}\n📍 ${loc?.area} - ${loc?.name}\n\n`;
    });
    
    mockStore.addMessage(transaction.id, msgContent.trim(), "system");
    mockStore.updateTransactionStatus(transaction.id, "scheduled");
    setShowScheduleModal(false);
    setCandidates([{ date: "", time: "", locationId: "" }]);
    alert("日程を提案し、相手が(自動モックとして)承認しました！ステータスが更新されます。");
    loadData();
  };

  const statusLabel = {
    proposing: "交渉中",
    scheduled: "予定決定済",
    completed: "取引完了",
    canceled: "キャンセル",
  }[transaction.status];

  return (
    <main className="mx-auto flex h-dvh max-w-[430px] flex-col bg-[#f5f7fb] relative">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-14 items-center border-b border-slate-200 bg-white px-4 shadow-sm shrink-0">
        <button onClick={() => router.back()} className="text-xl font-bold text-slate-700">
          &lt;
        </button>
        <div className="ml-4 flex min-w-0 flex-1 flex-col">
          <h1 className="truncate text-sm font-black text-slate-900">{partnerUser.nickname}</h1>
          <div className="text-[10px] text-slate-500">
            {item.title} (ステータス: <span className="font-bold text-blue-600">{statusLabel}</span>)
            {transaction.finalPrice !== undefined && ` - 最終価格: ¥${transaction.finalPrice}`}
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <div className="mx-auto rounded-full bg-slate-200 px-3 py-1 text-xs text-slate-500">
          取引が開始されました！挨拶をしてみましょう。
        </div>

        {messages.map((m) => {
          const isMe = m.senderId === mockStore.currentUser.id;
          if (m.type === "system") {
            return (
              <div key={m.id} className="mx-auto my-2 max-w-[85%] rounded bg-blue-50 p-3 text-sm text-blue-900 border border-blue-100 shadow-sm">
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            );
          }
          return (
            <div key={m.id} className={`flex max-w-[80%] flex-col ${isMe ? "self-end" : "self-start"}`}>
              <div
                className={`rounded-2xl px-4 py-2 text-sm shadow-sm ${
                  isMe ? "rounded-tr-sm bg-[#0047c7] text-white" : "rounded-tl-sm bg-white text-slate-900"
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
              <span className={`mt-1 text-[10px] text-slate-400 ${isMe ? "text-right" : "text-left"}`}>
                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
      </div>

      {/* Action Menu (Floating) */}
      {showMenu && (
        <div className="absolute bottom-16 left-0 right-0 z-20 mx-auto max-w-[430px] animate-in slide-in-from-bottom-2 bg-white px-4 py-4 shadow-[0_-10px_20px_rgba(0,0,0,0.1)] rounded-t-2xl border-t border-slate-100">
          <h3 className="mb-3 text-xs font-bold text-slate-500">取引アクション</h3>
          <div className="grid grid-cols-4 gap-2">
            <button onClick={() => handleAction("schedule")} className="flex flex-col items-center gap-1">
              <div className="grid size-12 place-items-center rounded-full bg-blue-50 text-xl text-[#0047c7]">📅</div>
              <span className="text-[10px] font-bold text-slate-700">日程提案</span>
            </button>
            <button onClick={() => handleAction("price")} className="flex flex-col items-center gap-1">
              <div className="grid size-12 place-items-center rounded-full bg-orange-50 text-xl text-orange-500">💰</div>
              <span className="text-[10px] font-bold text-slate-700">価格交渉</span>
            </button>
            <button onClick={() => handleAction("cancel")} className="flex flex-col items-center gap-1">
              <div className="grid size-12 place-items-center rounded-full bg-red-50 text-xl text-red-500">✖</div>
              <span className="text-[10px] font-bold text-slate-700">キャンセル</span>
            </button>
            <button onClick={() => handleAction("evaluate")} className="flex flex-col items-center gap-1">
              <div className="grid size-12 place-items-center rounded-full bg-green-50 text-xl text-green-500">⭐</div>
              <span className="text-[10px] font-bold text-slate-700">評価する</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Action Area (No Free Text Chat) */}
      <footer className="shrink-0 bg-white px-4 py-3 border-t border-slate-200 z-10">
        <div className="flex gap-2">
          <button
            onClick={() => handleAction("schedule")}
            disabled={transaction.status === "completed" || transaction.status === "canceled"}
            className="flex-1 rounded-full bg-[#0047c7] py-3 text-sm font-bold text-white shadow-sm disabled:opacity-50"
          >
            📅 日程を提案する
          </button>
          <button
            onClick={() => setShowMenu(!showMenu)}
            disabled={transaction.status === "completed" || transaction.status === "canceled"}
            className="grid size-12 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-50"
          >
            ...
          </button>
        </div>
      </footer>

      {/* Schedule Proposal Modal */}
      {showScheduleModal && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="w-full max-w-[430px] rounded-t-2xl bg-white flex flex-col h-[85vh]">
            <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3 shrink-0">
              <h2 className="text-sm font-bold text-slate-900">日程と場所の提案</h2>
              <button onClick={() => setShowScheduleModal(false)} className="text-slate-400 text-2xl leading-none">&times;</button>
            </header>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
              <div className="text-xs text-slate-600 mb-2">最大5つまで候補を提案できます。相手がその中から1つを選ぶと確定します。</div>
              
              {candidates.map((cand, index) => {
                const selectedLoc = locations.find(l => l.id === cand.locationId);
                return (
                  <div key={index} className="rounded-lg border border-slate-200 p-3 bg-slate-50 relative">
                    {candidates.length > 1 && (
                      <button onClick={() => setCandidates(candidates.filter((_, i) => i !== index))} className="absolute top-2 right-2 text-slate-400 text-xs">削除</button>
                    )}
                    <h3 className="text-sm font-bold text-slate-700 mb-3">候補 {index + 1}</h3>
                    
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">日付</label>
                        <input type="date" value={cand.date} onChange={(e) => updateCandidate(index, "date", e.target.value)} className="w-full rounded border border-slate-300 p-1.5 text-sm bg-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">時間</label>
                        <select value={cand.time} onChange={(e) => updateCandidate(index, "time", e.target.value)} className="w-full rounded border border-slate-300 p-1.5 text-sm bg-white">
                          <option value="">選択</option>
                          <option value="12:00">12:00</option>
                          <option value="12:15">12:15</option>
                          <option value="12:30">12:30</option>
                          <option value="12:45">12:45</option>
                          <option value="16:30">16:30</option>
                        </select>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="block text-xs font-bold text-slate-500 mb-1">場所 (エリア)</label>
                      <select onChange={(e) => setSelectedArea(e.target.value)} className="w-full rounded border border-slate-300 p-1.5 text-sm bg-white mb-2">
                        <option value="">エリアを選択</option>
                        {areas.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                      
                      <label className="block text-xs font-bold text-slate-500 mb-1">場所 (スポット)</label>
                      <select value={cand.locationId} onChange={(e) => updateCandidate(index, "locationId", e.target.value)} disabled={!selectedArea} className="w-full rounded border border-slate-300 p-1.5 text-sm bg-white disabled:bg-slate-100 disabled:text-slate-400">
                        <option value="">スポットを選択</option>
                        {locations.filter(l => l.area === selectedArea).map(loc => (
                          <option key={loc.id} value={loc.id}>{loc.name}</option>
                        ))}
                      </select>
                    </div>

                    {selectedLoc && (
                      <div className="mt-2 rounded overflow-hidden border border-slate-200 bg-white flex">
                        <img src={selectedLoc.imageUrl} alt={selectedLoc.name} className="w-24 h-16 object-cover bg-slate-200" />
                        <div className="p-2 flex items-center text-xs text-slate-600 leading-tight">
                          この周辺で待ち合わせします。目印を確認してください。
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {candidates.length < 5 && (
                <button onClick={addCandidate} className="py-3 border border-dashed border-slate-300 text-slate-500 font-bold text-sm rounded-lg hover:bg-slate-50">
                  ＋ 候補を追加する
                </button>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 shrink-0">
              <button onClick={submitSchedule} className="w-full rounded-full bg-[#0047c7] py-3 text-sm font-bold text-white shadow-md">
                提案を送信する
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
