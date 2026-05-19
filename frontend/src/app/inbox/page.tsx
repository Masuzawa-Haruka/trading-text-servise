"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { mockStore, MockTransaction, MockItem } from "@/lib/mockStore";

type Notification = {
  id: string;
  txId: string;
  title: string;
  time: string;
  read: boolean;
  isSystem: boolean;
};

export default function InboxPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const txs = mockStore.getTransactions();
    
    // 取引ベースの通知を生成
    const mockNotes: Notification[] = txs.map(tx => {
      const item = mockStore.getItem(tx.itemId);
      const isSeller = tx.sellerId === mockStore.currentUser.id;
      const partner = mockStore.getUser(isSeller ? tx.buyerId : tx.sellerId);
      
      let title = "";
      if (tx.status === "proposing") title = `「${item?.title}」の取引が開始されました`;
      else if (tx.status === "scheduled") title = `「${item?.title}」の日程が決定しました`;
      else if (tx.status === "canceled") title = `「${item?.title}」の取引がキャンセルされました`;
      else title = `「${item?.title}」の取引が完了しました`;

      return {
        id: `n_${tx.id}`,
        txId: tx.id,
        title,
        time: "今日", // モック
        read: tx.status === "completed" || tx.status === "canceled",
        isSystem: false,
      };
    });

    // システム通知
    mockNotes.push({
      id: "sys1",
      txId: "",
      title: "運営からのお知らせ: モック環境へようこそ！",
      time: "1日前",
      read: true,
      isSystem: true,
    });

    setNotifications(mockNotes);
  }, []);

  return (
    <main className="mx-auto min-h-dvh max-w-[430px] bg-white pb-24">
      <header className="sticky top-0 z-10 border-b border-slate-100 bg-white px-4 py-4">
        <h1 className="text-lg font-black text-slate-900">受信箱</h1>
      </header>

      <section className="divide-y divide-slate-100">
        {notifications.map((note) => {
          const content = (
            <article className={`flex gap-3 px-4 py-4 ${note.read ? "bg-white" : "bg-blue-50/50"} hover:bg-slate-50 transition-colors`}>
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-100 text-lg">
                {note.isSystem ? "📢" : "💬"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-sm font-bold text-slate-900">
                  {note.title}
                </p>
                <p className="text-xs text-slate-500">{note.time}</p>
              </div>
              {!note.read && (
                <div className="mt-2 size-2.5 shrink-0 rounded-full bg-blue-600" />
              )}
            </article>
          );

          if (note.txId) {
            return (
              <Link key={note.id} href={`/transactions/${note.txId}`}>
                {content}
              </Link>
            );
          }
          
          return <div key={note.id}>{content}</div>;
        })}
        {notifications.length === 0 && (
          <div className="py-10 text-center text-slate-500 text-sm">通知はありません</div>
        )}
      </section>
    </main>
  );
}
