import Link from 'next/link';

export function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <Link className="logo" href="/">Boat AI</Link>
        <nav className="nav">
          <Link href="/venue">開催場</Link>
          <Link href="/dashboard">成績</Link>
        </nav>
      </div>
    </header>
  );
}
