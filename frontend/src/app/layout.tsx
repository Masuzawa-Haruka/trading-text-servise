import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "OU Textbook",
  description: "大阪大学生専用の参考書リユースアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className="h-full antialiased"
    >
      <body className="min-h-full bg-[#f5f7fb] text-slate-950">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
