"use client";

import { usePathname } from "next/navigation";
import { AppFooter } from "@/components/AppFooter";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/auth");

  return (
    <>
      <div className={isAuthPage ? "min-h-dvh" : "min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))]"}>
        {children}
      </div>
      {isAuthPage ? null : <AppFooter />}
    </>
  );
}
