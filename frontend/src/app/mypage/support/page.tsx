"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export default function HelpSupportPage() {
  const router = useRouter();

  return (
    <main className="mx-auto min-h-dvh max-w-[430px] bg-[#f5f7fb] pb-24">
      <header className="sticky top-0 z-10 flex items-center border-b border-slate-100 bg-white px-4 py-4 shadow-sm">
        <button onClick={() => router.back()} className="text-xl font-bold text-slate-700">
          &lt;
        </button>
        <h1 className="flex-1 text-center text-base font-black text-slate-900 pr-4">ヘルプ・サポート</h1>
      </header>

      <section className="mt-4 bg-white">
        <div className="divide-y divide-slate-100">
          <Link href="/mypage/support/terms" className="flex items-center justify-between px-4 py-4 hover:bg-slate-50 transition-colors">
            <span className="text-sm font-bold text-slate-900">利用規約・免責事項</span>
            <span className="text-slate-400 font-bold">&gt;</span>
          </Link>

          <Link href="/mypage/support/contact" className="flex items-center justify-between px-4 py-4 hover:bg-slate-50 transition-colors">
            <span className="text-sm font-bold text-slate-900">お問い合わせ</span>
            <span className="text-slate-400 font-bold">&gt;</span>
          </Link>

          <Link href="/mypage/support/report" className="flex items-center justify-between px-4 py-4 hover:bg-slate-50 transition-colors">
            <span className="text-sm font-bold text-slate-900">通報する</span>
            <span className="text-slate-400 font-bold">&gt;</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
