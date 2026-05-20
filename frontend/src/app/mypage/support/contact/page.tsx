"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ContactPage() {
  const router = useRouter();
  const [type, setType] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || !subject || !content) {
      alert("必須項目を入力してください");
      return;
    }
    alert("お問い合わせを送信しました");
    router.push("/mypage/support");
  };

  return (
    <main className="mx-auto min-h-dvh max-w-[430px] bg-white pb-24 text-slate-900">
      <header className="sticky top-0 z-10 flex items-center border-b border-slate-100 bg-white px-4 py-4 shadow-sm">
        <button onClick={() => router.back()} className="text-xl font-bold text-slate-700">
          &lt;
        </button>
        <h1 className="flex-1 text-center text-base font-black pr-4">お問い合わせ</h1>
      </header>

      <section className="flex flex-col items-center py-8 px-4">
        <div className="grid size-16 place-items-center rounded-full bg-blue-50 text-blue-500 text-3xl mb-4">
          ✉️
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">運営へのお問い合わせ</h2>
        <p className="text-xs text-slate-500 text-center leading-relaxed">
          ご意見・ご質問・不具合のご報告など、<br />お気軽にお問い合わせください。
        </p>
      </section>

      <form onSubmit={handleSubmit} className="px-4 flex flex-col gap-5">
        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">
            お問い合わせ種別 <span className="rounded bg-red-100 px-1 text-[10px] text-red-500">必須</span>
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
          >
            <option value="">選択してください</option>
            <option value="使い方について">使い方について</option>
            <option value="不具合の報告">不具合の報告</option>
            <option value="ご意見・ご要望">ご意見・ご要望</option>
            <option value="その他">その他</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">
            件名 <span className="rounded bg-red-100 px-1 text-[10px] text-red-500">必須</span>
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="例) 取引についての質問"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">
            内容 <span className="rounded bg-red-100 px-1 text-[10px] text-red-500">必須</span>
          </label>
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="お問い合わせ内容を入力してください"
              rows={6}
              className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
            />
            <div className="absolute bottom-2 right-2 text-xs text-slate-400">
              {content.length}/1000
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">
            返信用メール <span className="text-xs font-normal text-slate-400">(任意)</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="連絡先のメールアドレスを入力してください"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
          />
          <p className="mt-1 text-[10px] text-slate-500">※阪大のメールアドレス以外でも構いません</p>
        </div>

        <div className="rounded-lg bg-slate-50 p-3 border border-slate-100 text-xs text-slate-600 flex gap-2 leading-relaxed">
          <span className="text-blue-500">ℹ️</span>
          <div>通常、3営業日以内にご返信いたします。<br />内容によってはお時間をいただく場合がございます。</div>
        </div>

        <button
          type="submit"
          className="w-full rounded bg-[#0047c7] py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700 mt-2"
        >
          送信する
        </button>
      </form>

      <section className="px-4 mt-8">
        <div className="rounded-lg bg-blue-50 p-4 border border-blue-100 text-blue-900">
          <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
            <span>✉️</span> お問い合わせについて
          </h3>
          <ul className="text-xs space-y-1 pl-6 list-disc list-outside">
            <li>取引の方法や使い方についてのご質問</li>
            <li>不具合のご報告</li>
            <li>ご意見・ご要望 など</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
