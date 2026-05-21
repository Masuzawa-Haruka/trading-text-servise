import {
  MOCK_AUTH_ENABLED,
  MOCK_SUPABASE_ANON_KEY,
  MOCK_SUPABASE_URL,
} from "@/lib/auth/mock";

export const SUPABASE_ENV_ERROR =
  "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY を設定するか、NEXT_PUBLIC_AUTH_MOCK_ENABLED=true をローカル開発で指定してください";

type SupabaseConfig = {
  url: string;
  anonKey: string;
};

export function getSupabaseConfig(): SupabaseConfig {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (isValidHttpUrl(supabaseUrl) && supabaseAnonKey) {
    return {
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
    };
  }

  if (MOCK_AUTH_ENABLED) {
    return {
      url: MOCK_SUPABASE_URL,
      anonKey: MOCK_SUPABASE_ANON_KEY,
    };
  }

  throw new Error(SUPABASE_ENV_ERROR);
}

export function getOptionalSupabaseConfig(): SupabaseConfig | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!isValidHttpUrl(supabaseUrl) || !supabaseAnonKey) {
    return null;
  }

  return {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
  };
}

export function isValidHttpUrl(value: string | undefined): value is string {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
