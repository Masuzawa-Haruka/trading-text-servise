"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getPasswordAuthErrorMessage,
  normalizeAuthEmail,
  resendSignupConfirmation,
  signInWithPassword,
  signUpWithPassword,
  validatePasswordAuthInput,
} from "@/lib/auth/password";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "signin" | "signup";

type AuthFormProps = {
  initialMode: AuthMode;
};

export function AuthForm({ initialMode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canResendConfirmation, setCanResendConfirmation] = useState(false);

  const isSignup = initialMode === "signup";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setCanResendConfirmation(false);

    const normalizedEmail = normalizeAuthEmail(email);
    const validationError = validatePasswordAuthInput({
      email: normalizedEmail,
      password,
    });

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      if (isSignup) {
        const { error: signUpError } = await signUpWithPassword(supabase, {
          email: normalizedEmail,
          password,
          nickname,
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(getNextPath())}`,
        });

        if (signUpError) {
          setError(getPasswordAuthErrorMessage(signUpError.message));
          setCanResendConfirmation(true);
          return;
        }

        setMessage("確認メールを送信しました。メール内のリンクから登録を完了してください。");
        setCanResendConfirmation(true);
        return;
      }

      const { error: signInError } = await signInWithPassword(supabase, {
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        setError(getPasswordAuthErrorMessage(signInError.message));
        setCanResendConfirmation(signInError.message.toLowerCase().includes("email not confirmed"));
        return;
      }

      router.replace(getNextPath());
      router.refresh();
    } catch {
      setError("認証処理に失敗しました。時間を置いて再度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendConfirmation() {
    setMessage(null);
    setError(null);

    const normalizedEmail = normalizeAuthEmail(email);
    if (!normalizedEmail) {
      setError("確認メールを再送するメールアドレスを入力してください。");
      return;
    }

    const validationError = validatePasswordAuthInput({
      email: normalizedEmail,
      password: password || "********",
    });
    if (validationError && validationError.includes("メールアドレス")) {
      setError(validationError);
      return;
    }

    try {
      setIsSubmitting(true);
      const { error: resendError } = await resendSignupConfirmation(createClient(), {
        email: normalizedEmail,
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(getNextPath())}`,
      });

      if (resendError) {
        setError(getPasswordAuthErrorMessage(resendError.message));
        return;
      }

      setMessage("確認メールを再送しました。メール内のリンクから登録を完了してください。");
      setCanResendConfirmation(true);
    } catch {
      setError("確認メールの再送に失敗しました。時間を置いて再度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  }

  function getNextPath(): string {
    const next = searchParams.get("next");
    if (!next || !next.startsWith("/") || next.startsWith("//")) {
      return "/";
    }

    return next;
  }

  function getAuthPath(nextMode: AuthMode): string {
    const path = nextMode === "signin" ? "/login" : "/signup";
    return `${path}?next=${encodeURIComponent(getNextPath())}`;
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col bg-white px-5 py-8">
      <div className="flex flex-1 flex-col justify-center">
        <p className="text-xs font-bold text-[#0047c7]">OU Textbook</p>
        <h1 className="mt-3 text-2xl font-black text-slate-950">
          {isSignup ? "阪大メールで新規登録" : "ログイン"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          大阪大学のメールアドレスで認証します。
        </p>

        <div className="mt-8 grid grid-cols-2 rounded border border-slate-200 bg-slate-50 p-1">
          <Link
            href={getAuthPath("signin")}
            className={`grid h-10 place-items-center rounded text-sm font-bold ${
              initialMode === "signin" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
            }`}
          >
            ログイン
          </Link>
          <Link
            href={getAuthPath("signup")}
            className={`grid h-10 place-items-center rounded text-sm font-bold ${
              initialMode === "signup" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
            }`}
          >
            新規登録
          </Link>
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

          {canResendConfirmation ? (
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={isSubmitting}
              className="w-full rounded border border-blue-100 bg-white px-3 py-2 text-sm font-bold text-[#0047c7] disabled:opacity-60"
            >
              確認メールを再送する
            </button>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="h-12 w-full rounded bg-[#0047c7] text-sm font-black text-white disabled:opacity-60"
          >
            {isSubmitting ? "処理中..." : isSignup ? "登録する" : "ログインする"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-500">
          {isSignup ? "すでにアカウントをお持ちですか？" : "アカウントをお持ちでないですか？"}{" "}
          <Link
            href={getAuthPath(isSignup ? "signin" : "signup")}
            className="font-bold text-[#0047c7]"
          >
            {isSignup ? "ログイン" : "新規登録"}
          </Link>
        </p>
      </div>
    </main>
  );
}
