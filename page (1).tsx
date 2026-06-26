import './globals.css';
import Header from '@/components/Header';

export const metadata = {
  title: 'Boat AI',
  description: '競艇データ分析AI'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
