import { createBrowserClient } from "@supabase/ssr";
import { MOCK_AUTH_ENABLED, withMockAuth } from "@/lib/auth/mock";
import { getSupabaseConfig } from "@/lib/supabase/env";

export function createClient() {
  const { url, anonKey } = getSupabaseConfig();

  const client = createBrowserClient(
    url,
    anonKey
  );

  return MOCK_AUTH_ENABLED ? withMockAuth(client) : client;
}
