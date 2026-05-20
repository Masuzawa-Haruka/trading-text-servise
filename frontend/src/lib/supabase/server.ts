import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createMockSupabaseClient, MOCK_AUTH_ENABLED } from "@/lib/auth/mock";

export async function createClient() {
  if (MOCK_AUTH_ENABLED) {
    return createMockSupabaseClient();
  }

  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!isValidHttpUrl(supabaseUrl) || !supabaseAnonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY を設定するか、NEXT_PUBLIC_AUTH_MOCK_ENABLED=true を指定してください"
    );
  }

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component から呼ばれた場合は Cookie の書き込みが不要
          }
        },
      },
    }
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
