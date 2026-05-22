"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createItem,
  uploadItemImages,
  type Campus,
  type ItemCondition,
} from "@/lib/items/api";

const CAMPUS_OPTIONS: { value: Campus; label: string }[] = [
  { value: "toyonaka", label: "豊中キャンパス" },
  { value: "suita", label: "吹田キャンパス" },
  { value: "minoh", label: "箕面キャンパス" },
];

const OSAKA_UNIV_DEPARTMENTS = [
  "文学部 人文学科",
  "人間科学部 人間科学科",
  "外国語学部 外国語学科",
  "法学部 法学科",
  "法学部 国際公共政策学科",
  "経済学部 経済・経営学科",
  "理学部 数学科",
  "理学部 物理学科",
  "理学部 化学科",
  "理学部 生物科学科",
  "医学部 医学科",
  "医学部 保健学科",
  "歯学部 歯学科",
  "薬学部 薬学科",
  "薬学部 創薬科学科",
  "工学部 応用自然科学科",
  "工学部 応用理工学科",
  "工学部 電子情報工学科",
  "工学部 環境・エネルギー工学科",
  "工学部 地球総合工学科",
  "基礎工学部 電子物理科学科",
  "基礎工学部 化学応用科学科",
  "基礎工学部 システム科学科",
  "基礎工学部 情報科学科",
];

type ImageDraft = {
  file: File;
  previewUrl: string;
};

export default function SellPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imagesRef = useRef<ImageDraft[]>([]);

  const [images, setImages] = useState<ImageDraft[]>([]);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("");
  const [showDeptSuggestions, setShowDeptSuggestions] = useState(false);
  const [condition, setCondition] = useState<ItemCondition | "">("");
  const [campus, setCampus] = useState<Campus | "">("");
  const [price, setPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredDepartments = useMemo(
    () => OSAKA_UNIV_DEPARTMENTS.filter((departmentName) => departmentName.includes(department)),
    [department]
  );

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    };
  }, []);

  const handleAddImages = (files: FileList | null) => {
    if (!files) return;

    const selectedFiles = Array.from(files);
    const nextImages = [...images];

    for (const file of selectedFiles) {
      if (nextImages.length >= 5) break;
      if (!file.type.startsWith("image/")) {
        setError("画像ファイルのみアップロードできます");
        continue;
      }
      nextImages.push({
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    setImages(nextImages);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = (index: number) => {
    const target = images[index];
    if (target) {
      URL.revokeObjectURL(target.previewUrl);
    }
    setImages(images.filter((_, imageIndex) => imageIndex !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normalizedTitle = title.trim();
    const normalizedDepartment = department.trim();
    const normalizedAuthor = author.trim();
    const normalizedDescription = description.trim();
    const parsedPrice = Number.parseInt(price, 10);

    if (!normalizedTitle || !condition || !campus || price === "" || !normalizedDepartment) {
      setError("必須項目をすべて入力してください");
      return;
    }

    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      setError("価格は0円以上の整数で入力してください");
      return;
    }

    if (images.length === 0) {
      setError("商品画像を1枚以上選択してください");
      return;
    }

    setIsSubmitting(true);

    try {
      const imageUrls = await uploadItemImages(images.map((image) => image.file));
      const created = await createItem({
        title: normalizedTitle,
        author: normalizedAuthor || undefined,
        description: normalizedDescription || undefined,
        condition,
        campus,
        category: normalizedDepartment,
        price: parsedPrice,
        image_urls: imageUrls,
      });

      router.push(`/items/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "出品に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto min-h-dvh max-w-[430px] bg-white pb-24">
      <header className="sticky top-0 z-10 border-b border-slate-100 bg-white px-4 py-4">
        <h1 className="text-lg font-black text-slate-900">出品する</h1>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-4">
        {error ? (
          <div className="rounded-md bg-red-50 px-3 py-3 text-sm font-bold text-red-700">{error}</div>
        ) : null}

        <section>
          <label className="mb-2 block text-sm font-bold text-slate-700">
            商品画像 <span className="text-xs font-normal text-red-500">*必須 (最大5枚)</span>
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => handleAddImages(event.target.files)}
            className="sr-only"
          />
          <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
            {images.map((image, idx) => (
              <div key={image.previewUrl} className="relative size-20 shrink-0 rounded border border-slate-200 bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.previewUrl} alt={`Preview ${idx + 1}`} className="h-full w-full rounded object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(idx)}
                  className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-slate-800 text-xs text-white"
                >
                  ×
                </button>
              </div>
            ))}
            {images.length < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="grid size-20 shrink-0 place-items-center rounded border border-dashed border-slate-300 bg-slate-100 text-slate-400 transition-colors hover:bg-slate-200"
              >
                <span className="text-2xl">+</span>
              </button>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              参考書名 <span className="text-xs font-normal text-red-500">*必須</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: 基礎からの線形代数"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              著者名 <span className="text-xs font-normal text-slate-500">任意</span>
            </label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="例: 石村園子"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="relative">
            <label className="mb-1 block text-sm font-bold text-slate-700">
              対象学科（カテゴリ） <span className="text-xs font-normal text-red-500">*必須</span>
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                setShowDeptSuggestions(true);
              }}
              onFocus={() => setShowDeptSuggestions(true)}
              onBlur={() => setTimeout(() => setShowDeptSuggestions(false), 200)}
              placeholder="例: 工学部 応用自然科学科"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {showDeptSuggestions && filteredDepartments.length > 0 && (
              <ul className="absolute z-20 mt-1 max-h-40 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
                {filteredDepartments.map((dept) => (
                  <li
                    key={dept}
                    onMouseDown={() => {
                      setDepartment(dept);
                      setShowDeptSuggestions(false);
                    }}
                    className="cursor-pointer px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    {dept}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              状態 <span className="text-xs font-normal text-red-500">*必須</span>
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as ItemCondition | "")}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">選択してください</option>
              <option value="new">新品・未使用</option>
              <option value="used_good">目立った傷や汚れなし</option>
              <option value="used_bad">傷や汚れあり</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              キャンパス <span className="text-xs font-normal text-red-500">*必須</span>
            </label>
            <select
              value={campus}
              onChange={(e) => setCampus(e.target.value as Campus | "")}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">選択してください</option>
              {CAMPUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">出品者が主に受け渡ししやすいキャンパスです</p>
          </div>
        </section>

        <section>
          <label className="mb-1 block text-sm font-bold text-slate-700">
            価格 <span className="text-xs font-normal text-red-500">*必須</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">¥</span>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
              className="w-full rounded-md border border-slate-300 py-2 pl-7 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">※0円(無償譲渡)も可能です</p>
        </section>

        <section>
          <label className="mb-1 block text-sm font-bold text-slate-700">説明文</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="例: 書き込みが数ページあります。表紙に少し折れがあります。"
            rows={4}
            className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </section>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-4 w-full rounded-full bg-[#0047c7] py-3 text-sm font-bold text-white shadow-md hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isSubmitting ? "出品中..." : "出品する"}
        </button>
      </form>
    </main>
  );
}
