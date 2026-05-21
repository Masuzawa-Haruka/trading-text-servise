import { createClient } from "@/lib/supabase/client";

const DEFAULT_API_BASE_URL = "http://localhost:3001";

type ApiFetchOptions = RequestInit & {
  requireAuth?: boolean;
};

export async function apiFetch(path: string, options: ApiFetchOptions = {}) {
  const { requireAuth = true, headers, ...init } = options;
  const requestHeaders = new Headers(headers);

  if (requireAuth) {
    const supabase = createClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.access_token) {
      throw new Error("ログインが必要です");
    }

    requestHeaders.set("Authorization", `Bearer ${session.access_token}`);
  }

  if (init.body && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  return fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: requestHeaders,
  });
}

function getApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/$/, "");
}
