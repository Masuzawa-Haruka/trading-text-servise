import { createClient } from "@/lib/supabase/client";

const DEFAULT_API_BASE_URL = "http://localhost:3001";
const DEFAULT_API_TIMEOUT_MS = 10_000;

type ApiFetchOptions = RequestInit & {
  requireAuth?: boolean;
  timeoutMs?: number;
};

export async function apiFetch(path: string, options: ApiFetchOptions = {}) {
  const { requireAuth = true, timeoutMs = DEFAULT_API_TIMEOUT_MS, headers, signal, ...init } = options;
  const requestHeaders = new Headers(headers);

  if (requireAuth) {
    const supabase = createClient();
    const {
      data: { session: refreshedSession },
    } = await withTimeout(
      supabase.auth.refreshSession(),
      timeoutMs,
      "認証セッションの更新がタイムアウトしました",
    );
    const session =
      refreshedSession ??
      (
        await withTimeout(
          supabase.auth.getSession(),
          timeoutMs,
          "認証セッションの取得がタイムアウトしました",
        )
      ).data.session;

    if (!session?.access_token) {
      throw new Error("ログインが必要です");
    }

    requestHeaders.set("Authorization", `Bearer ${session.access_token}`);
  }

  if (init.body && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  return fetchWithTimeout(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: requestHeaders,
    signal,
    timeoutMs,
  });
}

function getApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/$/, "");
}

function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs: number },
): Promise<Response> {
  const { timeoutMs, signal, ...requestInit } = init;
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  const abortFromParent = () => controller.abort();
  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", abortFromParent, { once: true });
    }
  }

  return fetch(input, { ...requestInit, signal: controller.signal })
    .catch((error) => {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error("APIリクエストがタイムアウトしました");
      }
      throw error;
    })
    .finally(() => {
      globalThis.clearTimeout(timeoutId);
      signal?.removeEventListener("abort", abortFromParent);
    });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = globalThis.setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => {
        globalThis.clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        globalThis.clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}
