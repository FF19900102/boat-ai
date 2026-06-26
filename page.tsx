import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Boat AI',
  description: '競艇AI 確率・期待値分析アプリ',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
