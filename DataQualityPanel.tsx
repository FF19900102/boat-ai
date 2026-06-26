import Link from 'next/link';
export default function Header(){return <div className="container header"><Link href="/" className="brand">Boat AI</Link><div className="nav"><Link href="/">開催場</Link><Link href="/data">データ取得</Link><Link href="/api-preview">API</Link><Link href="/analysis">分析</Link><Link href="/dashboard">成績</Link><Link href="/settings">設定</Link></div></div>}
