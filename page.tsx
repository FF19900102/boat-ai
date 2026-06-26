import './globals.css'

export const metadata = {
  title: 'Boat AI',
  description: '競艇AI予想アプリ'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
