import Link from "next/link";

export default function Header() {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="font-black text-2xl tracking-tight">Boat AI</Link>
        <nav className="flex gap-2 text-sm">
          <Link className="btn btn-soft" href="/venue">開催場</Link>
          <Link className="btn btn-soft" href="/">ホーム</Link>
        </nav>
      </div>
    </header>
  );
}
