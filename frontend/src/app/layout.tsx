import type { Metadata } from "next";
import { AppFooter } from "@/components/AppFooter";
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
        <div className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))]">{children}</div>
        <AppFooter />
      </body>
    </html>
  );
}
