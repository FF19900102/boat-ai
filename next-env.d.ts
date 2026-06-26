import Link from 'next/link';

export default function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <Link href="/" style={{ color: 'white', textDecoration: 'none' }}>
          <div className="brand">Boat AI</div>
          <div className="sub">確率・期待値・回収率で見る競艇分析</div>
        </Link>
        <div className="sub">Phase 1</div>
      </div>
    </header>
  );
}
