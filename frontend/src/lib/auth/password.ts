import type { SupabaseClient } from "@supabase/supabase-js";
import { isOsakaUniversityEmail } from "@/lib/auth/domain";

export type PasswordAuthInput = {
  email: string;
  password: string;
};

export type SignUpWithPasswordInput = PasswordAuthInput & {
  nickname?: string;
  emailRedirectTo: string;
};

export type ResendSignupConfirmationInput = {
  email: string;
  emailRedirectTo: string;
};

export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validatePasswordAuthInput(input: PasswordAuthInput): string | null {
  if (!isOsakaUniversityEmail(input.email)) {
    return "大阪大学のメールアドレス（@ecs.osaka-u.ac.jp）を入力してください";
  }

  if (input.password.length < 8) {
    return "パスワードは8文字以上で入力してください";
  }

  return null;
}

export async function signInWithPassword(
  supabase: SupabaseClient,
  input: PasswordAuthInput,
) {
  return supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });
}

export async function signUpWithPassword(
  supabase: SupabaseClient,
  input: SignUpWithPasswordInput,
) {
  return supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        nickname: input.nickname?.trim() || "ゲストユーザー",
      },
      emailRedirectTo: input.emailRedirectTo,
    },
  });
}

export async function resendSignupConfirmation(
  supabase: SupabaseClient,
  input: ResendSignupConfirmationInput,
) {
  return supabase.auth.resend({
    type: "signup",
    email: input.email,
    options: {
      emailRedirectTo: input.emailRedirectTo,
    },
  });
}

export function getPasswordAuthErrorMessage(errorMessage: string): string {
  const normalizedMessage = errorMessage.toLowerCase();

  if (normalizedMessage.includes("already registered") || normalizedMessage.includes("already exists")) {
    return "このメールアドレスはすでに登録されています。ログインするか、確認メールを再送してください。";
  }

  if (normalizedMessage.includes("email not confirmed")) {
    return "メール確認が完了していません。確認メールのリンクを開いてからログインしてください。";
  }

  if (normalizedMessage.includes("invalid login credentials")) {
    return "メールアドレスまたはパスワードが正しくありません。";
  }

  if (normalizedMessage.includes("signup is disabled")) {
    return "現在、新規登録は停止されています。時間を置いて再度お試しください。";
  }

  if (normalizedMessage.includes("rate limit") || normalizedMessage.includes("too many")) {
    return "試行回数が多すぎます。しばらく時間を置いて再度お試しください。";
  }

  if (normalizedMessage.includes("database error")) {
    return "ユーザー情報の作成に失敗しました。時間を置いて再度お試しください。";
  }

  return errorMessage || "認証処理に失敗しました。時間を置いて再度お試しください。";
}
