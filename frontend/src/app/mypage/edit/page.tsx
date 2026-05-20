"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mockStore } from "@/lib/mockStore";

export default function ProfileEditPage() {
  const router = useRouter();
  const [name, setName] = useState(mockStore.currentUser.nickname);
  const [email, setEmail] = useState("taro.handai@example.com");
  const [occupation, setOccupation] = useState("大学生");
  const [bio, setBio] = useState("経済学を学んでいます。\n信頼される取引を心がけます。");

  const handleSave = () => {
    // モックでは実際には保存しないが、アラートだけ出す
    alert("プロフィールを保存しました");
    router.push("/mypage");
  };

  return (
    <main className="mx-auto min-h-dvh max-w-[430px] bg-white pb-24">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-4 py-4 shadow-sm">
        <button onClick={() => router.back()} className="text-xl font-bold text-slate-700">
          &lt;
        </button>
        <h1 className="text-base font-black text-slate-900">プロフィール編集</h1>
        <button onClick={handleSave} className="text-sm font-bold text-blue-600">
          保存
        </button>
      </header>

      <section className="flex flex-col items-center py-6">
        <div className="relative mb-2">
          <div className="grid size-24 place-items-center rounded-full bg-slate-200 text-4xl">
            👤
          </div>
          <div className="absolute bottom-0 right-0 grid size-7 place-items-center rounded-full border border-slate-200 bg-white shadow-sm">
            <span className="text-xs">📷</span>
          </div>
        </div>
        <button className="text-xs font-bold text-blue-600">
          プロフィール画像を変更
        </button>
      </section>

      <section className="px-4 py-2 flex flex-col gap-5">
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700">
            氏名 <span className="rounded bg-red-100 px-1 text-[10px] text-red-500">必須</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700">
            メールアドレス <span className="rounded bg-red-100 px-1 text-[10px] text-red-500">必須</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700">
            職業・所属 <span className="text-[10px] text-slate-400">(任意)</span>
          </label>
          <input
            type="text"
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700">
            自己紹介 <span className="text-[10px] text-slate-400">(任意)</span>
          </label>
          <div className="relative">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
            />
            <span className="absolute bottom-2 right-2 text-[10px] text-slate-400">
              {bio.length}/200
            </span>
          </div>
        </div>
      </section>

      <section className="mt-4 border-y border-slate-100">
        <button className="flex w-full items-center justify-between px-4 py-4 text-sm font-bold text-slate-700 hover:bg-slate-50">
          <span>パスワードの変更</span>
          <span className="text-slate-400">&gt;</span>
        </button>
      </section>

      <section className="mt-8 px-4 text-center">
        <button className="text-sm font-bold text-red-500 hover:underline">
          アカウントを削除する
        </button>
      </section>
    </main>
  );
}
