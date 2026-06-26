import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Boat AI',
  description: '競艇AI 予想・期待値・結果検証アプリ'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
