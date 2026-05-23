import { MOCK_AUTH_ENABLED } from "@/lib/auth/mock";
import { createClient } from "@/lib/supabase/client";

export const PROFILE_IMAGE_BUCKET = "profile-images";
export const MAX_PROFILE_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_PROFILE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

export async function uploadProfileImage(file: File): Promise<string> {
  validateProfileImageFile(file);

  if (MOCK_AUTH_ENABLED) {
    return fileToDataUrl(file);
  }

  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("プロフィール画像のアップロードにはログインが必要です");
  }

  const extension = getFileExtension(file.name);
  const objectPath = `${user.id}/${Date.now()}-${crypto.randomUUID()}${extension}`;
  const { error } = await supabase.storage.from(PROFILE_IMAGE_BUCKET).upload(objectPath, file, {
    cacheControl: "3600",
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (error) {
    throw new Error(`プロフィール画像のアップロードに失敗しました: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(PROFILE_IMAGE_BUCKET).getPublicUrl(objectPath);

  return publicUrl;
}

export async function deleteProfileImage(imageUrl: string | null | undefined): Promise<void> {
  if (MOCK_AUTH_ENABLED || !imageUrl) {
    return;
  }

  const objectPath = getObjectPathFromPublicUrl(imageUrl);
  if (!objectPath) {
    return;
  }

  const { error } = await createClient().storage.from(PROFILE_IMAGE_BUCKET).remove([objectPath]);
  if (error) {
    console.warn("プロフィール画像の削除に失敗しました", error);
  }
}

export function validateProfileImageFile(file: File): void {
  if (!ALLOWED_PROFILE_IMAGE_TYPES.has(file.type)) {
    throw new Error("プロフィール画像はJPEG、PNG、WebP、GIF、HEICのいずれかを選択してください");
  }

  if (file.size > MAX_PROFILE_IMAGE_SIZE_BYTES) {
    throw new Error("プロフィール画像は5MB以内で選択してください");
  }
}

function getFileExtension(fileName: string): string {
  const match = fileName.match(/\.[a-zA-Z0-9]+$/);
  return match ? match[0].toLowerCase() : "";
}

function getObjectPathFromPublicUrl(imageUrl: string): string | null {
  try {
    const url = new URL(imageUrl);
    const marker = `/object/public/${PROFILE_IMAGE_BUCKET}/`;
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
      reject(new Error("プロフィール画像の読み込みに失敗しました"));
    };
    reader.onerror = () => reject(new Error("プロフィール画像の読み込みに失敗しました"));
    reader.readAsDataURL(file);
  });
}
