import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-black tracking-tight">Boat AI</Link>
        <nav className="flex gap-2 text-sm font-bold">
          <Link className="btn btn-light py-2" href="/">本日開催</Link>
          <Link className="btn btn-light py-2" href="/races">レース一覧</Link>
        </nav>
      </div>
    </header>
  );
}
