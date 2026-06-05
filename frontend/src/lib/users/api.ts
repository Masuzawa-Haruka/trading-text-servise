import { apiFetch } from "@/lib/api/client";
import { MOCK_AUTH_ENABLED } from "@/lib/auth/mock";
import { mockStore } from "@/lib/mockStore";

const MOCK_PROFILE_STORAGE_KEY = "mock_api_profile";
const MOCK_SELLER_ID = "22222222-2222-4222-8222-222222222222";

export type UserProfile = {
  id: string;
  email: string;
  nickname: string;
  profile_image_url: string | null;
  credit_score: number;
  status: string;
  created_at: string;
  updated_at: string;
};

export type PublicUserProfile = {
  id: string;
  nickname: string;
  profile_image_url: string | null;
  credit_score: number;
  status: string;
  evaluation_count: number;
};

export type UpdateUserProfilePayload = {
  nickname?: string;
  profile_image_url?: string | null;
};

export async function getMyProfile(): Promise<UserProfile> {
  if (MOCK_AUTH_ENABLED) {
    return readMockProfile();
  }

  const response = await apiFetch("/api/users/me");
  return parseJsonResponse<UserProfile>(response, "プロフィールの取得に失敗しました");
}

export async function getPublicUserProfile(userId: string): Promise<PublicUserProfile> {
  if (MOCK_AUTH_ENABLED) {
    return mockPublicProfile(userId);
  }

  const response = await apiFetch(`/api/users/${encodeURIComponent(userId)}/public-profile`, {
    requireAuth: false,
  });
  return parseJsonResponse<PublicUserProfile>(response, "出品者プロフィールの取得に失敗しました");
}

export async function updateMyProfile(payload: UpdateUserProfilePayload): Promise<UserProfile> {
  if (MOCK_AUTH_ENABLED) {
    const current = readMockProfile();
    const updated = {
      ...current,
      ...(payload.nickname !== undefined ? { nickname: payload.nickname.trim() } : {}),
      ...(payload.profile_image_url !== undefined
        ? { profile_image_url: payload.profile_image_url }
        : {}),
      updated_at: new Date().toISOString(),
    };
    writeMockProfile(updated);
    return updated;
  }

  const response = await apiFetch("/api/users/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<UserProfile>(response, "プロフィールの保存に失敗しました");
}

async function parseJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : fallbackMessage;
    throw new Error(message);
  }

  return data as T;
}

function readMockProfile(): UserProfile {
  if (typeof window === "undefined") {
    return defaultMockProfile();
  }

  const raw = window.localStorage.getItem(MOCK_PROFILE_STORAGE_KEY);
  if (!raw) {
    const profile = defaultMockProfile();
    writeMockProfile(profile);
    return profile;
  }

  try {
    const parsed = JSON.parse(raw);
    return isUserProfile(parsed) ? parsed : defaultMockProfile();
  } catch {
    return defaultMockProfile();
  }
}

function writeMockProfile(profile: UserProfile): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MOCK_PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

function defaultMockProfile(): UserProfile {
  const now = new Date().toISOString();
  return {
    id: mockStore.currentUser.id,
    email: "mock-user@ecs.osaka-u.ac.jp",
    nickname: mockStore.currentUser.nickname,
    profile_image_url: null,
    credit_score: mockStore.currentUser.creditScore,
    status: "active",
    created_at: now,
    updated_at: now,
  };
}

function mockPublicProfile(userId: string): PublicUserProfile {
  if (userId === mockStore.currentUser.id) {
    const profile = readMockProfile();
    return {
      id: profile.id,
      nickname: profile.nickname,
      profile_image_url: profile.profile_image_url,
      credit_score: profile.credit_score,
      status: profile.status,
      evaluation_count: mockStore.getReceivedEvaluations(profile.id).length,
    };
  }

  return {
    id: userId || MOCK_SELLER_ID,
    nickname: "テスト出品者",
    profile_image_url: null,
    credit_score: 120,
    status: "active",
    evaluation_count: 6,
  };
}

function isUserProfile(value: unknown): value is UserProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Record<string, unknown>;
  return (
    typeof profile.id === "string" &&
    typeof profile.email === "string" &&
    typeof profile.nickname === "string" &&
    (typeof profile.profile_image_url === "string" || profile.profile_image_url === null) &&
    typeof profile.credit_score === "number" &&
    typeof profile.status === "string" &&
    typeof profile.created_at === "string" &&
    typeof profile.updated_at === "string"
  );
}
