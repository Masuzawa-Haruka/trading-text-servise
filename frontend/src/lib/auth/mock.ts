import type { User } from "@supabase/supabase-js";

export const MOCK_AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_MOCK_ENABLED === "true";

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
  email: "mock-user@example.com",
  role: "authenticated",
};

export function createMockSupabaseClient() {
  return {
    auth: {
      async getUser() {
        return {
          data: { user: mockUser },
          error: null,
        };
      },
      async getSession() {
        return {
          data: {
            session: {
              access_token: "mock-access-token",
              refresh_token: "mock-refresh-token",
              expires_in: 3600,
              expires_at: Math.floor(Date.now() / 1000) + 3600,
              token_type: "bearer",
              user: mockUser,
            },
          },
          error: null,
        };
      },
      async signOut() {
        return { error: null };
      },
    },
  };
}
