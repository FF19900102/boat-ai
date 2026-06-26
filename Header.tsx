import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Boat AI",
  description: "競艇の確率・期待値分析アプリ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
