"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyProfile, updateMyProfile } from "@/lib/users/api";

export default function ProfileEditPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
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
          setProfileImageUrl(profile.profile_image_url ?? "");
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

  const handleSave = async () => {
    const normalizedNickname = nickname.trim();
    const normalizedProfileImageUrl = profileImageUrl.trim();

    if (!normalizedNickname) {
      setError("ニックネームを入力してください");
      return;
    }

    if (normalizedNickname.length > 50) {
      setError("ニックネームは50文字以内で入力してください");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await updateMyProfile({
        nickname: normalizedNickname,
        profile_image_url: normalizedProfileImageUrl || null,
      });
      router.push("/mypage");
      router.refresh();
    } catch {
      setError("プロフィールを保存できませんでした");
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
            {profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profileImageUrl} alt="" className="size-full object-cover" />
            ) : (
              <span aria-hidden="true">👤</span>
            )}
          </div>
          <div className="absolute bottom-0 right-0 grid size-7 place-items-center rounded-full border border-slate-200 bg-white shadow-sm">
            <span className="text-xs">📷</span>
          </div>
        </div>
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

        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700">
            プロフィール画像URL <span className="text-[10px] text-slate-400">(任意)</span>
          </label>
          <input
            type="url"
            value={profileImageUrl}
            onChange={(event) => setProfileImageUrl(event.target.value)}
            disabled={loading}
            placeholder="https://..."
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none disabled:bg-slate-50"
          />
        </div>
      </section>
    </main>
  );
}
