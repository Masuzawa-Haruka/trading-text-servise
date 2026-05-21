import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { MOCK_AUTH_ENABLED, withMockAuth } from "@/lib/auth/mock";
import { getSupabaseConfig } from "@/lib/supabase/env";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseConfig();

  const client = createServerClient(
    url,
    anonKey,
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

  return MOCK_AUTH_ENABLED ? withMockAuth(client) : client;
}
