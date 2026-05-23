"use client";

import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyProfile, updateMyProfile } from "@/lib/users/api";
import {
  deleteProfileImage,
  uploadProfileImage,
  validateProfileImageFile,
} from "@/lib/users/profileImage";

export default function ProfileEditPage() {
  const router = useRouter();
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [savedProfileImageUrl, setSavedProfileImageUrl] = useState("");
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState("");
  const [shouldRemoveImage, setShouldRemoveImage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      try {
        const profile = await getMyProfile();
        if (!ignore) {
          setNickname(profile.nickname);
          setEmail(profile.email);
          setSavedProfileImageUrl(profile.profile_image_url ?? "");
        }
      } catch (caughtError) {
        if (!ignore) {
          if (caughtError instanceof Error && caughtError.message === "ログインが必要です") {
            router.replace("/login");
            return;
          }
          setError("プロフィールを取得できませんでした");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      ignore = true;
    };
  }, [router]);

  useEffect(() => {
    return () => {
      if (previewImageUrl) {
        URL.revokeObjectURL(previewImageUrl);
      }
    };
  }, [previewImageUrl]);

  const displayedImageUrl = previewImageUrl || (shouldRemoveImage ? "" : savedProfileImageUrl);

  const clearFileInputs = () => {
    if (galleryInputRef.current) {
      galleryInputRef.current.value = "";
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      validateProfileImageFile(file);
      const nextPreviewUrl = URL.createObjectURL(file);
      if (previewImageUrl) {
        URL.revokeObjectURL(previewImageUrl);
      }
      setSelectedImageFile(file);
      setPreviewImageUrl(nextPreviewUrl);
      setShouldRemoveImage(false);
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "画像を選択できませんでした");
      clearFileInputs();
    }
  };

  const handleRemoveImage = () => {
    if (previewImageUrl) {
      URL.revokeObjectURL(previewImageUrl);
    }
    setSelectedImageFile(null);
    setPreviewImageUrl("");
    setShouldRemoveImage(true);
    clearFileInputs();
  };

  const handleSave = async () => {
    const normalizedNickname = nickname.trim();

    if (!normalizedNickname) {
      setError("ニックネームを入力してください");
      return;
    }

    if (normalizedNickname.length > 50) {
      setError("ニックネームは50文字以内で入力してください");
      return;
    }

    let uploadedProfileImageUrl: string | null = null;

    try {
      setSaving(true);
      setError(null);
      const nextProfileImageUrl = selectedImageFile
        ? await uploadProfileImage(selectedImageFile)
        : shouldRemoveImage
          ? null
          : savedProfileImageUrl || null;
      uploadedProfileImageUrl = selectedImageFile ? nextProfileImageUrl : null;

      await updateMyProfile({
        nickname: normalizedNickname,
        profile_image_url: nextProfileImageUrl,
      });

      if (savedProfileImageUrl && savedProfileImageUrl !== nextProfileImageUrl) {
        await deleteProfileImage(savedProfileImageUrl);
      }

      router.push("/mypage");
      router.refresh();
    } catch (caughtError) {
      if (uploadedProfileImageUrl) {
        await deleteProfileImage(uploadedProfileImageUrl);
      }
      setError(caughtError instanceof Error ? caughtError.message : "プロフィールを保存できませんでした");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto min-h-dvh max-w-[430px] bg-white pb-24">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-4 py-4 shadow-sm">
        <button onClick={() => router.back()} className="text-xl font-bold text-slate-700">
          &lt;
        </button>
        <h1 className="text-base font-black text-slate-900">プロフィール編集</h1>
        <button
          onClick={handleSave}
          disabled={loading || saving}
          className="text-sm font-bold text-blue-600 disabled:text-slate-300"
        >
          {saving ? "保存中" : "保存"}
        </button>
      </header>

      <section className="flex flex-col items-center py-6">
        <div className="relative mb-2">
          <div className="grid size-24 place-items-center overflow-hidden rounded-full bg-slate-200 text-4xl">
            {displayedImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={displayedImageUrl} alt="" className="size-full object-cover" />
            ) : (
              <span aria-hidden="true">👤</span>
            )}
          </div>
          <div className="absolute bottom-0 right-0 grid size-7 place-items-center rounded-full border border-slate-200 bg-white shadow-sm">
            <span className="text-xs">📷</span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-2 px-4">
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            disabled={loading || saving}
            className="rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:bg-slate-300"
          >
            画像を選択
          </button>
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={loading || saving}
            className="rounded-full border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 disabled:text-slate-300"
          >
            カメラで撮影
          </button>
          {displayedImageUrl ? (
            <button
              type="button"
              onClick={handleRemoveImage}
              disabled={loading || saving}
              className="rounded-full border border-red-200 px-4 py-2 text-xs font-bold text-red-600 disabled:text-slate-300"
            >
              削除
            </button>
          ) : null}
        </div>
        <p className="mt-2 px-4 text-center text-[11px] font-medium text-slate-400">
          JPEG、PNG、WebP、GIF、HEIC / 5MBまで
        </p>
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
          className="hidden"
          onChange={handleImageChange}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
          capture="environment"
          className="hidden"
          onChange={handleImageChange}
        />
      </section>

      {error ? (
        <section className="mx-4 mb-4 rounded-lg bg-red-50 px-3 py-2">
          <p className="text-xs font-bold text-red-600">{error}</p>
        </section>
      ) : null}

      <section className="flex flex-col gap-5 px-4 py-2">
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700">
            ニックネーム <span className="rounded bg-red-100 px-1 text-[10px] text-red-500">必須</span>
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            disabled={loading}
            maxLength={50}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none disabled:bg-slate-50"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700">メールアドレス</label>
          <input
            type="email"
            value={email}
            readOnly
            className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
          />
        </div>

        <p className="rounded-md bg-slate-50 px-3 py-2 text-xs font-medium leading-5 text-slate-500">
          プロフィール画像は保存時にアップロードされます。差し替えや削除はマイページにすぐ反映されます。
        </p>
      </section>
    </main>
  );
}
