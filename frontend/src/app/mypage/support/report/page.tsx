"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { mockStore, MockTransaction, MockItem } from "@/lib/mockStore";

type ReportType = {
  id: string;
  icon: string;
  title: string;
  description: string;
};

const REPORT_TYPES: ReportType[] = [
  { id: "user_behavior", icon: "👤", title: "不適切なユーザー行為", description: "暴言・ハラスメント・脅迫など" },
  { id: "fake_item", icon: "✉️", title: "虚偽の出品・情報", description: "実際と異なる商品情報・価格など" },
  { id: "fraud", icon: "💵", title: "詐欺・金銭トラブル", description: "代金未払い・商品未受け取りなど" },
  { id: "cancel", icon: "📅", title: "ドタキャン・無断キャンセル", description: "約束を守らない行為" },
  { id: "other", icon: "🚫", title: "その他の違反行為", description: "上記以外の不適切な行為" },
];

export default function ReportPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [targetUser, setTargetUser] = useState("");
  const [transactionItem, setTransactionItem] = useState("");
  const [details, setDetails] = useState("");
  const [userTransactions, setUserTransactions] = useState<{tx: MockTransaction, item: MockItem}[]>([]);

  useEffect(() => {
    const user = mockStore.currentUser;
    const allTxs = mockStore.getTransactions();
    const relevantTxs = allTxs.filter(tx => tx.buyerId === user.id || tx.sellerId === user.id);
    
    const txsWithItems = relevantTxs.map(tx => {
      const item = mockStore.getItem(tx.itemId);
      return { tx, item: item! };
    }).filter(t => t.item); // Ensure item exists
    
    setUserTransactions(txsWithItems);
  }, []);

  const handleNext = () => {
    if (!selectedType) {
      alert("通報内容を選択してください");
      return;
    }
    setStep(2);
  };

  const handleSubmit = () => {
    if (!targetUser || !details) {
      alert("対象ユーザーと詳細内容は必須です");
      return;
    }
    alert("通報を受け付けました");
    router.push("/mypage/support");
  };

  return (
    <main className="mx-auto min-h-dvh max-w-[430px] bg-white pb-24 text-slate-900">
      <header className="sticky top-0 z-10 flex items-center border-b border-slate-100 bg-white px-4 py-4 shadow-sm">
        <button onClick={() => step === 2 ? setStep(1) : router.back()} className="text-xl font-bold text-slate-700">
          &lt;
        </button>
        <h1 className="flex-1 text-center text-base font-black pr-4">通報する</h1>
      </header>

      {/* Progress Bar */}
      <div className="py-6 px-8 bg-slate-50 border-b border-slate-100">
        <div className="flex justify-between items-center relative">
          <div className="absolute top-3 left-6 right-6 h-0.5 bg-slate-200 -z-10"></div>
          
          <div className="flex flex-col items-center">
            <div className={`grid size-6 place-items-center rounded-full text-xs font-bold text-white mb-2 ${step === 2 ? 'bg-green-500' : 'bg-blue-600'}`}>
              {step === 2 ? '✓' : '1'}
            </div>
            <span className={`text-[10px] ${step === 1 ? 'font-bold text-slate-900' : 'text-slate-500'}`}>通報内容の選択</span>
          </div>

          <div className="flex flex-col items-center">
            <div className={`grid size-6 place-items-center rounded-full text-xs font-bold text-white mb-2 ${step === 2 ? 'bg-blue-600' : 'bg-slate-300'}`}>
              2
            </div>
            <span className={`text-[10px] ${step === 2 ? 'font-bold text-slate-900' : 'text-slate-400'}`}>詳細の入力</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="grid size-6 place-items-center rounded-full bg-slate-300 text-xs font-bold text-white mb-2">
              3
            </div>
            <span className="text-[10px] text-slate-400">確認</span>
          </div>
        </div>
      </div>

      {step === 1 && (
        <div className="px-4 py-6">
          <div className="text-center mb-8">
            <div className="inline-grid size-16 place-items-center rounded-full bg-red-50 text-red-500 text-3xl mb-4">
              🚩
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">不適切な行為の通報</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              安心してご利用いただくために、<br />不適切な行為を通報してください。
            </p>
          </div>

          <h3 className="text-sm font-bold text-slate-900 mb-4">通報する内容を選択してください</h3>
          
          <div className="space-y-3">
            {REPORT_TYPES.map((type) => (
              <div 
                key={type.id}
                onClick={() => setSelectedType(type)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${selectedType?.id === type.id ? 'border-blue-500 bg-blue-50/50' : 'border-slate-100 hover:border-blue-200'}`}
              >
                <div className={`grid size-5 place-items-center rounded-full border ${selectedType?.id === type.id ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300 bg-white'}`}>
                  {selectedType?.id === type.id && <span className="text-[10px]">✓</span>}
                </div>
                <div className="text-xl opacity-70 w-6 text-center">{type.icon}</div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-slate-900">{type.title}</div>
                  <div className="text-[10px] text-slate-500">{type.description}</div>
                </div>
                <div className="text-slate-300">&gt;</div>
              </div>
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={!selectedType}
            className="w-full rounded bg-[#0047c7] py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700 mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            次へ
          </button>
          
          <div className="mt-8 rounded-lg bg-red-50 p-4 border border-red-100">
            <h4 className="text-sm font-bold text-red-900 mb-2 flex items-center gap-2">
              <span className="text-red-500">🛡️</span> 通報について
            </h4>
            <ul className="text-xs text-red-800 space-y-1 pl-6 list-disc list-outside">
              <li>24時間以内に運営が内容を確認します</li>
              <li>通報者の情報は相手に伝わりません</li>
              <li>虚偽の通報はご遠慮ください</li>
            </ul>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="px-4 py-6">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-700 mb-2">通報内容</h3>
            <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50">
              <div className="text-2xl opacity-70 w-8 text-center">{selectedType?.icon}</div>
              <div className="flex-1">
                <div className="text-sm font-bold text-slate-900">{selectedType?.title}</div>
                <div className="text-xs text-slate-500">{selectedType?.description}</div>
              </div>
              <button onClick={() => setStep(1)} className="text-xs font-bold text-blue-600 px-2 py-1">
                変更
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">
                対象ユーザー <span className="rounded bg-red-100 px-1 text-[10px] text-red-500">必須</span>
              </label>
              <input
                type="text"
                value={targetUser}
                onChange={(e) => setTargetUser(e.target.value)}
                placeholder="ユーザー名を入力"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
              />
              <p className="mt-1 text-[10px] text-slate-500">※ユーザーのプロフィールや取引画面からも通報できます</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">
                取引する教科書 <span className="text-xs font-normal text-slate-400">(任意)</span>
              </label>
              <select
                value={transactionItem}
                onChange={(e) => setTransactionItem(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
              >
                <option value="">取引を選択</option>
                {userTransactions.map(({tx, item}) => (
                  <option key={tx.id} value={tx.id}>{item.title} ({tx.status})</option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-slate-500">※関連する取引がある場合は選択してください</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">
                詳細内容 <span className="rounded bg-red-100 px-1 text-[10px] text-red-500">必須</span>
              </label>
              <div className="relative">
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="いつ・どこで・何があったかを&#13;&#10;できるだけ詳しくご記入ください"
                  rows={6}
                  className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                />
                <div className="absolute bottom-2 right-2 text-xs text-slate-400">
                  {details.length}/1000
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">
                証拠画像 <span className="text-xs font-normal text-slate-400">(任意)</span>
              </label>
              <p className="mb-2 text-xs text-slate-500">スクリーンショットなどがあれば添付してください</p>
              <div className="grid place-items-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-8 cursor-pointer hover:bg-slate-100 transition-colors">
                <div className="text-2xl mb-2 text-slate-400">📷</div>
                <div className="text-sm font-bold text-slate-700">画像を選択</div>
                <div className="text-[10px] text-slate-400 mt-1">最大5枚まで (1枚あたり10MB以内)</div>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              className="w-full rounded bg-[#0047c7] py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700 mt-2"
            >
              確認画面へ
            </button>
          </div>

          <div className="mt-8 rounded-lg bg-orange-50 p-4 border border-orange-100 text-orange-900">
            <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
              <span className="text-orange-500">🔒</span> 安心・安全のために
            </h4>
            <p className="text-xs leading-relaxed text-orange-800">
              皆さまが安心して利用できるサービスにするため、通報へのご協力をお願いいたします。
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
