"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mockStore } from "@/lib/mockStore";

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

export default function SellPage() {
  const router = useRouter();
  
  const [images, setImages] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("");
  const [showDeptSuggestions, setShowDeptSuggestions] = useState(false);
  const [condition, setCondition] = useState("");
  const [campus, setCampus] = useState("");
  const [price, setPrice] = useState("");

  const filteredDepartments = OSAKA_UNIV_DEPARTMENTS.filter(d => d.includes(department));

  const handleAddDummyImage = () => {
    if (images.length < 5) {
      setImages([...images, `https://placehold.co/100x100/e2e8f0/64748b?text=Img+${images.length + 1}`]);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !condition || !campus || price === "" || !department) {
      alert("必須項目をすべて入力してください");
      return;
    }

    const numPrice = parseInt(price, 10);

    mockStore.addItem({
      title,
      author: author || "不明",
      condition,
      campus,
      price: numPrice,
      free: numPrice === 0,
      // description and department would normally be saved here too, 
      // but MockItem doesn't have them yet. We will mock it gracefully.
    });

    alert("出品しました！");
    router.push("/");
  };

  return (
    <main className="mx-auto min-h-dvh max-w-[430px] bg-white pb-24">
      <header className="sticky top-0 z-10 border-b border-slate-100 bg-white px-4 py-4">
        <h1 className="text-lg font-black text-slate-900">出品する</h1>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-4">
        {/* 画像アップロード */}
        <section>
          <label className="mb-2 block text-sm font-bold text-slate-700">
            商品画像 <span className="text-xs font-normal text-red-500">*必須 (最大5枚)</span>
          </label>
          <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
            {images.map((img, idx) => (
              <div key={idx} className="relative size-20 shrink-0 rounded border border-slate-200 bg-slate-100">
                <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover rounded" />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(idx)}
                  className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full size-5 flex items-center justify-center text-xs"
                >
                  ×
                </button>
              </div>
            ))}
            {images.length < 5 && (
              <button
                type="button"
                onClick={handleAddDummyImage}
                className="grid size-20 shrink-0 place-items-center rounded bg-slate-100 text-slate-400 border border-dashed border-slate-300 hover:bg-slate-200 transition-colors"
              >
                <span className="text-2xl">+</span>
              </button>
            )}
          </div>
        </section>

        {/* 商品詳細 */}
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
              <ul className="absolute z-20 w-full mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-md shadow-lg">
                {filteredDepartments.map((dept) => (
                  <li
                    key={dept}
                    onClick={() => {
                      setDepartment(dept);
                      setShowDeptSuggestions(false);
                    }}
                    className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 cursor-pointer"
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
              onChange={(e) => setCondition(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">選択してください</option>
              <option value="新品・未使用">新品・未使用</option>
              <option value="目立った傷や汚れなし">目立った傷や汚れなし</option>
              <option value="傷や汚れあり">傷や汚れあり</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              キャンパス <span className="text-xs font-normal text-red-500">*必須</span>
            </label>
            <select
              value={campus}
              onChange={(e) => setCampus(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">選択してください</option>
              <option value="豊中キャンパス">豊中キャンパス</option>
              <option value="吹田キャンパス">吹田キャンパス</option>
              <option value="箕面キャンパス">箕面キャンパス</option>
            </select>
          </div>
        </section>

        {/* 価格 */}
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
              className="w-full rounded-md border border-slate-300 py-2 pl-7 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">※0円(無償譲渡)も可能です</p>
        </section>

        {/* 説明文 (Moved below Price) */}
        <section>
          <label className="mb-1 block text-sm font-bold text-slate-700">
            説明文
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="例: 書き込みが数ページあります。表紙に少し折れがあります。"
            rows={4}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          />
        </section>

        {/* 送信ボタン */}
        <button
          type="submit"
          className="mt-4 w-full rounded-full bg-[#0047c7] py-3 text-sm font-bold text-white shadow-md hover:bg-blue-700"
        >
          出品する
        </button>
      </form>
    </main>
  );
}
