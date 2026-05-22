import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { MOCK_AUTH_ENABLED } from "@/lib/auth/mock";
import { getOptionalSupabaseConfig } from "@/lib/supabase/env";

const PROTECTED_PATH_PREFIXES = [
  "/mypage",
  "/sell",
  "/transactions",
  "/inbox",
];

const AUTH_PATHS = ["/login", "/signup"];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });
  const pathname = request.nextUrl.pathname;

  if (MOCK_AUTH_ENABLED) {
    return supabaseResponse;
  }

  const isProtectedPath = PROTECTED_PATH_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  const isAuthPath = AUTH_PATHS.includes(pathname);

  if (!isProtectedPath && !isAuthPath) {
    return supabaseResponse;
  }

  const supabaseConfig = getOptionalSupabaseConfig();

  if (!supabaseConfig) {
    if (process.env.NODE_ENV === "development") {
      if (isProtectedPath) {
        return redirectToLogin(request);
      }

      return supabaseResponse;
    }

    return new NextResponse("Supabase authentication is not configured", {
      status: 503,
    });
  }

  const supabase = createServerClient(
    supabaseConfig.url,
    supabaseConfig.anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // セッションのリフレッシュ（必ず getUser() を呼ぶこと）
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedPath) {
    return redirectToLogin(request);
  }

  if (user && isAuthPath) {
    return NextResponse.redirect(
      new URL(getSafeNextPath(request.nextUrl.searchParams.get("next")), request.url)
    );
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * 以下を除くすべてのリクエストパスにマッチ:
     * - _next/static (静的ファイル)
     * - _next/image (画像最適化)
     * - favicon.ico (ファビコン)
     * - public フォルダの画像ファイル
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

function getSafeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }

  return next;
}

function redirectToLogin(request: NextRequest): NextResponse {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/login";
  redirectUrl.search = "";
  redirectUrl.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`
  );
  return NextResponse.redirect(redirectUrl);
}
