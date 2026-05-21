"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { isOsakaUniversityEmail } from "@/lib/auth/domain";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignup = mode === "signup";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!isOsakaUniversityEmail(normalizedEmail)) {
      setError("大阪大学のメールアドレス（@osaka-u.ac.jp）でログインしてください");
      return;
    }

    if (password.length < 8) {
      setError("パスワードは8文字以上で入力してください");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      if (isSignup) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              nickname: nickname.trim() || "ゲストユーザー",
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        setMessage("確認メールを送信しました。メール内のリンクから登録を完了してください。");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("認証処理に失敗しました。時間を置いて再度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col bg-white px-5 py-8">
      <div className="flex flex-1 flex-col justify-center">
        <p className="text-xs font-bold text-[#0047c7]">OU Textbook</p>
        <h1 className="mt-3 text-2xl font-black text-slate-950">
          {isSignup ? "阪大メールで登録" : "ログイン"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          大阪大学のメールアドレスで認証します。
        </p>

        <div className="mt-8 grid grid-cols-2 rounded border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`h-10 rounded text-sm font-bold ${
              mode === "signin" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
            }`}
          >
            ログイン
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`h-10 rounded text-sm font-bold ${
              mode === "signup" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
            }`}
          >
            新規登録
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-xs font-bold text-slate-700">阪大メール</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              placeholder="your.name@osaka-u.ac.jp"
              className="mt-2 h-12 w-full rounded border border-slate-200 px-3 text-sm outline-none focus:border-[#0047c7]"
              required
            />
          </label>

          {isSignup ? (
            <label className="block">
              <span className="text-xs font-bold text-slate-700">ニックネーム</span>
              <input
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                type="text"
                autoComplete="nickname"
                className="mt-2 h-12 w-full rounded border border-slate-200 px-3 text-sm outline-none focus:border-[#0047c7]"
              />
            </label>
          ) : null}

          <label className="block">
            <span className="text-xs font-bold text-slate-700">パスワード</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              className="mt-2 h-12 w-full rounded border border-slate-200 px-3 text-sm outline-none focus:border-[#0047c7]"
              required
            />
          </label>

          {error ? (
            <p className="rounded border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-600">
              {error}
            </p>
          ) : null}

          {message ? (
            <p className="rounded border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700">
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="h-12 w-full rounded bg-[#0047c7] text-sm font-black text-white disabled:opacity-60"
          >
            {isSubmitting ? "処理中..." : isSignup ? "登録する" : "ログインする"}
          </button>
        </form>
      </div>
    </main>
  );
}
