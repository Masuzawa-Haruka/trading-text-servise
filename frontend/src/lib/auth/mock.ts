import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

const MOCK_AUTH_REQUESTED = process.env.NEXT_PUBLIC_AUTH_MOCK_ENABLED === "true";
const IS_LOCAL_DEVELOPMENT =
  process.env.NODE_ENV === "development" && process.env.VERCEL_ENV === undefined;

if (MOCK_AUTH_REQUESTED && !IS_LOCAL_DEVELOPMENT) {
  throw new Error(
    "NEXT_PUBLIC_AUTH_MOCK_ENABLED はローカル開発専用です。NODE_ENV=development のローカル環境以外では有効化できません。"
  );
}

export const MOCK_AUTH_ENABLED = MOCK_AUTH_REQUESTED && IS_LOCAL_DEVELOPMENT;

export const MOCK_USER_ID = "11111111-1111-4111-8111-111111111111";

export const mockUser: User = {
  id: MOCK_USER_ID,
  app_metadata: {
    provider: "mock",
    providers: ["mock"],
  },
  user_metadata: {
    nickname: "大阪 太郎",
  },
  aud: "authenticated",
  created_at: "2026-05-20T00:00:00.000Z",
  email: "mock-user@osaka-u.ac.jp",
  role: "authenticated",
};

export const MOCK_SUPABASE_URL = "http://127.0.0.1:54321";
export const MOCK_SUPABASE_ANON_KEY = "mock-anon-key";

const mockAuthClient = {
  async getUser() {
    return {
      data: { user: mockUser },
      error: null,
    };
  },
  async getSession() {
    return {
      data: {
        session: createMockSession(),
      },
      error: null,
    };
  },
  async refreshSession() {
    return {
      data: {
        user: mockUser,
        session: createMockSession(),
      },
      error: null,
    };
  },
  async signInWithPassword() {
    return {
      data: {
        user: mockUser,
        session: createMockSession(),
      },
      error: null,
    };
  },
  async signUp() {
    return {
      data: {
        user: mockUser,
        session: createMockSession(),
      },
      error: null,
    };
  },
  async resend() {
    return {
      data: {},
      error: null,
    };
  },
  async exchangeCodeForSession() {
    return {
      data: {
        user: mockUser,
        session: createMockSession(),
      },
      error: null,
    };
  },
  async signOut() {
    return { error: null };
  },
};

export function withMockAuth<TClient extends SupabaseClient>(client: TClient): TClient {
  return new Proxy(client, {
    get(target, property, receiver) {
      if (property === "auth") {
        return mockAuthClient;
      }

      return Reflect.get(target, property, receiver);
    },
  });
}

function createMockSession(): Session {
  return {
    access_token: "mock-access-token",
    refresh_token: "mock-refresh-token",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user: mockUser,
  };
}
