export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div>
          <div className="text-xl font-black tracking-tight">Boat AI</div>
          <div className="text-xs text-slate-500">確率・期待値・結果検証</div>
        </div>
        <div className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">Phase 1 Full</div>
      </div>
    </header>
  );
}
