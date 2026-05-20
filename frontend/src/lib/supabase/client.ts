import { createBrowserClient } from "@supabase/ssr";
import { createMockSupabaseClient, MOCK_AUTH_ENABLED } from "@/lib/auth/mock";

export function createClient() {
  if (MOCK_AUTH_ENABLED) {
    return createMockSupabaseClient();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!isValidHttpUrl(supabaseUrl) || !supabaseAnonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY を設定するか、NEXT_PUBLIC_AUTH_MOCK_ENABLED=true を指定してください"
    );
  }

  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  );
}

function isValidHttpUrl(value: string | undefined): value is string {
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
