"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type TabItem = {
  href: string;
  label: string;
  icon: "search" | "sell" | "inbox" | "profile";
  badge?: number;
};

const tabs: TabItem[] = [
  { href: "/", label: "探す", icon: "search" },
  { href: "/sell", label: "出品", icon: "sell" },
  { href: "/inbox", label: "受信箱", icon: "inbox", badge: 3 },
  { href: "/mypage", label: "マイページ", icon: "profile" },
];

export function AppFooter() {
  const pathname = usePathname();

  return (
    <footer className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur">
      <nav aria-label="メインナビゲーション" className="mx-auto grid h-16 max-w-[430px] grid-cols-4 px-2">
        {tabs.map((tab) => {
          const isActive = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex min-w-0 flex-col items-center justify-center gap-1 text-[11px] font-bold ${
                isActive ? "text-[#0047c7]" : "text-slate-700"
              }`}
            >
              <span className="relative grid size-7 place-items-center">
                <FooterIcon name={tab.icon} active={isActive} />
                {tab.badge ? (
                  <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-[#0047c7] text-[9px] leading-none text-white">
                    {tab.badge}
                  </span>
                ) : null}
              </span>
              <span className="max-w-full truncate">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </footer>
  );
}

function FooterIcon({ name, active }: { name: TabItem["icon"]; active: boolean }) {
  const stroke = active ? "#0047c7" : "#0f172a";

  if (name === "sell") {
    return (
      <svg aria-hidden="true" viewBox="0 0 28 28" className="size-7">
        <circle cx="14" cy="14" r="10.5" fill="none" stroke={stroke} strokeWidth="2" />
        <path d="M14 8.8v10.4M8.8 14h10.4" stroke={stroke} strokeLinecap="round" strokeWidth="2" />
      </svg>
    );
  }

  if (name === "search") {
    return (
      <svg aria-hidden="true" viewBox="0 0 28 28" className="size-7">
        <circle cx="12.2" cy="12.2" r="6.9" fill="none" stroke={stroke} strokeWidth="2" />
        <path d="m17.3 17.3 5 5" stroke={stroke} strokeLinecap="round" strokeWidth="2" />
      </svg>
    );
  }

  if (name === "inbox") {
    return (
      <svg aria-hidden="true" viewBox="0 0 28 28" className="size-7">
        <rect x="5" y="6.5" width="18" height="15" rx="4" fill="none" stroke={stroke} strokeWidth="2" />
        <path d="M8.5 12h11M8.5 16h7" stroke={stroke} strokeLinecap="round" strokeWidth="2" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 28 28" className="size-7">
      <circle cx="14" cy="10" r="4.2" fill="none" stroke={stroke} strokeWidth="2" />
      <path d="M6.8 22c1.1-4.1 3.7-6.1 7.2-6.1s6.1 2 7.2 6.1" fill="none" stroke={stroke} strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}
