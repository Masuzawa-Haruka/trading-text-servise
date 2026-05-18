export default function InboxPage() {
  const notifications = [
    {
      id: 1,
      title: "「基礎からの線形代数」に購入希望があります",
      time: "2時間前",
      read: false,
    },
    {
      id: 2,
      title: "「ミクロ経済学の基礎」の取引が完了しました",
      time: "1日前",
      read: true,
    },
    {
      id: 3,
      title: "運営からのお知らせ: メンテナンス完了",
      time: "3日前",
      read: true,
    },
  ];

  return (
    <main className="mx-auto min-h-dvh max-w-[430px] bg-white">
      <header className="sticky top-0 z-10 border-b border-slate-100 bg-white px-4 py-4">
        <h1 className="text-lg font-black text-slate-900">受信箱</h1>
      </header>

      <section className="divide-y divide-slate-100">
        {notifications.map((note) => (
          <article
            key={note.id}
            className={`flex gap-3 px-4 py-4 ${note.read ? "bg-white" : "bg-blue-50/50"}`}
          >
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-100 text-lg">
              {note.id === 3 ? "📢" : "💬"}
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
        ))}
      </section>
    </main>
  );
}
