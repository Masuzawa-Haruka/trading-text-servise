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

export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validatePasswordAuthInput(input: PasswordAuthInput): string | null {
  if (!isOsakaUniversityEmail(input.email)) {
    return "大阪大学のメールアドレス（@osaka-u.ac.jp）を入力してください";
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
