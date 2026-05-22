import { apiFetch } from "@/lib/api/client";
import { MOCK_AUTH_ENABLED, MOCK_USER_ID } from "@/lib/auth/mock";
import { createClient } from "@/lib/supabase/client";

export const REPORT_EVIDENCE_BUCKET = "report-evidence";
export const MAX_REPORT_EVIDENCE_IMAGES = 5;
export const MAX_REPORT_EVIDENCE_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MOCK_REPORTS_STORAGE_KEY = "mock_api_reports";
export const ALLOWED_REPORT_EVIDENCE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

export type Report = {
  id: string;
  transaction_id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: string;
  detail: string;
  evidence_image_urls: string[];
  created_at: string;
  updated_at: string;
};

export type SubmitReportPayload = {
  transaction_id: string;
  reported_user_id: string;
  reason: string;
  detail: string;
  evidence_image_urls?: string[];
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

export async function uploadReportEvidenceImages(files: File[]): Promise<string[]> {
  validateEvidenceFiles(files);

  if (files.length === 0) {
    return [];
  }

  if (MOCK_AUTH_ENABLED) {
    return Promise.all(files.map(fileToDataUrl));
  }

  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("証拠画像のアップロードにはログインが必要です");
  }

  const uploadedUrls: string[] = [];
  const uploadedPaths: string[] = [];

  try {
    for (const [index, file] of files.entries()) {
      const extension = getFileExtension(file.name);
      const objectPath = `${user.id}/${Date.now()}-${index}-${crypto.randomUUID()}${extension}`;
      const { error } = await supabase.storage
        .from(REPORT_EVIDENCE_BUCKET)
        .upload(objectPath, file, {
          cacheControl: "3600",
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (error) {
        throw new Error(`証拠画像のアップロードに失敗しました: ${error.message}`);
      }

      uploadedPaths.push(objectPath);
      const {
        data: { publicUrl },
      } = supabase.storage.from(REPORT_EVIDENCE_BUCKET).getPublicUrl(objectPath);
      uploadedUrls.push(publicUrl);
    }
  } catch (error) {
    if (uploadedPaths.length > 0) {
      const { error: removeError } = await supabase.storage
        .from(REPORT_EVIDENCE_BUCKET)
        .remove(uploadedPaths);
      if (removeError) {
        console.warn("アップロード済み証拠画像のロールバックに失敗しました", removeError);
      }
    }
    throw error;
  }

  return uploadedUrls;
}

export async function deleteReportEvidenceImages(imageUrls: string[]): Promise<void> {
  if (MOCK_AUTH_ENABLED || imageUrls.length === 0) {
    return;
  }

  const objectPaths = imageUrls
    .map(getObjectPathFromPublicUrl)
    .filter((path): path is string => typeof path === "string");

  if (objectPaths.length === 0) {
    return;
  }

  const { error } = await createClient().storage.from(REPORT_EVIDENCE_BUCKET).remove(objectPaths);
  if (error) {
    console.warn("送信失敗後の証拠画像削除に失敗しました", error);
  }
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
    evidence_image_urls: payload.evidence_image_urls ?? [],
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
    Array.isArray(report.evidence_image_urls) &&
    report.evidence_image_urls.every((url) => typeof url === "string") &&
    typeof report.created_at === "string" &&
    typeof report.updated_at === "string"
  );
}

function validateEvidenceFiles(files: File[]): void {
  if (files.length > MAX_REPORT_EVIDENCE_IMAGES) {
    throw new Error("証拠画像は最大5枚まで添付できます");
  }

  for (const file of files) {
    if (!ALLOWED_REPORT_EVIDENCE_IMAGE_TYPES.has(file.type)) {
      throw new Error("証拠画像はJPEG、PNG、WebP、GIF、HEICのいずれかを選択してください");
    }
    if (file.size > MAX_REPORT_EVIDENCE_IMAGE_SIZE_BYTES) {
      throw new Error("証拠画像は1枚あたり10MB以内で選択してください");
    }
  }
}

function getFileExtension(fileName: string): string {
  const match = fileName.match(/\.[a-zA-Z0-9]+$/);
  return match ? match[0].toLowerCase() : "";
}

function getObjectPathFromPublicUrl(imageUrl: string): string | null {
  try {
    const url = new URL(imageUrl);
    const marker = `/object/public/${REPORT_EVIDENCE_BUCKET}/`;
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex === -1) return null;
    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("証拠画像の読み込みに失敗しました"));
    };
    reader.onerror = () => reject(new Error("証拠画像の読み込みに失敗しました"));
    reader.readAsDataURL(file);
  });
}
