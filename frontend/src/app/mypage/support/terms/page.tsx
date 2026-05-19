"use client";

import { useRouter } from "next/navigation";

export default function TermsAndDisclaimerPage() {
  const router = useRouter();

  return (
    <main className="mx-auto min-h-dvh max-w-[430px] bg-white pb-24 text-slate-900">
      <header className="sticky top-0 z-10 flex items-center border-b border-slate-100 bg-white px-4 py-4 shadow-sm">
        <button onClick={() => router.back()} className="text-xl font-bold text-slate-700">
          &lt;
        </button>
        <h1 className="flex-1 text-center text-base font-black pr-4">利用規約・免責事項</h1>
      </header>

      <div className="p-5 space-y-8">
        <section>
          <h2 className="text-lg font-black border-b border-slate-200 pb-2 mb-4 text-[#0047c7]">利用規約</h2>
          
          <div className="space-y-6 text-sm leading-relaxed">
            <div>
              <h3 className="font-bold text-slate-800 mb-1">1. サービス概要</h3>
              <p>本サービスは、大阪大学の学生同士で参考書等を譲渡・交換するためのマッチングサービスです。</p>
            </div>

            <div>
              <h3 className="font-bold text-slate-800 mb-1">2. 利用対象</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>大阪大学に在籍する学生のみ利用できます。</li>
                <li className="text-red-600 font-bold">学外利用禁止</li>
                <li className="text-red-600 font-bold">なりすまし禁止</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-slate-800 mb-1">3. 禁止事項</h3>
              <p className="mb-2 text-xs font-bold text-slate-500">以下の行為を固く禁じます。</p>
              <ul className="list-disc pl-5 space-y-1 text-red-600 font-bold">
                <li>なりすまし</li>
                <li>虚偽出品</li>
                <li>ドタキャン</li>
                <li>ハラスメント</li>
                <li>商業利用</li>
                <li>転売目的大量出品</li>
                <li>危険行為</li>
                <li>外部SNS誘導</li>
                <li>不適切画像</li>
              </ul>
            </div>

            <div className="rounded-lg bg-orange-50 p-4 border border-orange-100">
              <h3 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                <span className="text-lg">⚠️</span> 4. 取引について
              </h3>
              <p className="font-black text-orange-900 mb-2">取引は利用者同士の自己責任で行われます。</p>
              <p className="font-bold text-orange-900">金銭授受は当事者間で直接行ってください。</p>
            </div>

            <div>
              <h3 className="font-bold text-slate-800 mb-1">5. 信用スコア</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>取引状況や評価に応じて信用スコアが変動します。</li>
                <li>悪質なキャンセル等が確認された場合、利用制限を行う場合があります。</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-slate-800 mb-1">6. アカウント停止</h3>
              <p>運営は、規約違反または不適切行為が確認された場合、事前通知なく利用停止できるものとします。</p>
            </div>

            <div>
              <h3 className="font-bold text-slate-800 mb-1">7. サービス変更</h3>
              <p>運営は予告なくサービス内容を変更・停止できるものとします。</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-black border-b border-slate-200 pb-2 mb-4 text-[#0047c7]">免責事項</h2>
          
          <div className="space-y-6 text-sm leading-relaxed">
            <div>
              <h3 className="font-bold text-slate-800 mb-1">1. 個人間取引</h3>
              <p>本サービスは利用者間の取引機会を提供するものであり、取引当事者にはなりません。</p>
            </div>

            <div>
              <h3 className="font-bold text-slate-800 mb-1">2. 金銭トラブル免責</h3>
              <p>金銭授受・未払い・詐欺等について運営は責任を負いません。</p>
            </div>

            <div>
              <h3 className="font-bold text-slate-800 mb-1">3. 商品状態</h3>
              <p>参考書の状態、内容、書き込み等について運営は保証しません。</p>
            </div>

            <div className="rounded-lg bg-red-50 p-4 border border-red-100">
              <h3 className="font-bold text-red-800 mb-1">4. 対面トラブル</h3>
              <p className="font-black text-red-900">利用者間の対面受け渡しに関するトラブルについて運営は責任を負いません。</p>
            </div>

            <div>
              <h3 className="font-bold text-slate-800 mb-1">5. システム障害</h3>
              <p>システム障害・通知遅延等によって生じた損害について責任を負いません。</p>
            </div>

            <div className="rounded-lg bg-slate-100 p-4 border border-slate-200">
              <h3 className="font-bold text-slate-800 mb-1">6. 大学との関係</h3>
              <p className="font-black text-slate-900">本サービスは大阪大学公式サービスではありません。</p>
            </div>
            
            <div className="mt-8 rounded-xl bg-blue-50 p-4 text-center border border-blue-200 shadow-sm">
              <span className="text-2xl block mb-2">🤝</span>
              <p className="font-black text-blue-900 leading-relaxed">
                トラブル防止のため、公共性・安全性の高い場所で受け渡しを行ってください。
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
