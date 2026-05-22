import { apiFetch } from "@/lib/api/client";
import { MOCK_AUTH_ENABLED, MOCK_USER_ID } from "@/lib/auth/mock";

const MOCK_REPORTS_STORAGE_KEY = "mock_api_reports";

export type Report = {
  id: string;
  transaction_id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: string;
  detail: string;
  created_at: string;
  updated_at: string;
};

export type SubmitReportPayload = {
  transaction_id: string;
  reported_user_id: string;
  reason: string;
  detail: string;
};

export async function submitReport(payload: SubmitReportPayload): Promise<Report> {
  if (MOCK_AUTH_ENABLED) {
    return createMockReport(payload);
  }

  const response = await apiFetch("/api/reports", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<Report>(response, "通報の送信に失敗しました");
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

function createMockReport(payload: SubmitReportPayload): Report {
  if (typeof window === "undefined") {
    return buildMockReport(payload);
  }

  const reports = readMockReports();
  if (
    reports.some(
      (report) =>
        report.transaction_id === payload.transaction_id && report.reporter_id === MOCK_USER_ID,
    )
  ) {
    throw new Error("この取引はすでに通報済みです");
  }

  const report = buildMockReport(payload);
  window.localStorage.setItem(MOCK_REPORTS_STORAGE_KEY, JSON.stringify([report, ...reports]));
  return report;
}

function buildMockReport(payload: SubmitReportPayload): Report {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    transaction_id: payload.transaction_id,
    reporter_id: MOCK_USER_ID,
    reported_user_id: payload.reported_user_id,
    reason: payload.reason,
    detail: payload.detail,
    created_at: now,
    updated_at: now,
  };
}

function readMockReports(): Report[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(MOCK_REPORTS_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isReport) : [];
  } catch {
    return [];
  }
}

function isReport(value: unknown): value is Report {
  if (!value || typeof value !== "object") return false;
  const report = value as Record<string, unknown>;
  return (
    typeof report.id === "string" &&
    typeof report.transaction_id === "string" &&
    typeof report.reporter_id === "string" &&
    typeof report.reported_user_id === "string" &&
    typeof report.reason === "string" &&
    typeof report.detail === "string" &&
    typeof report.created_at === "string" &&
    typeof report.updated_at === "string"
  );
}
