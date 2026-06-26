export function Header() {
  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
  return (
    <header className="header">
      <div>
        <div className="logo">Boat AI</div>
        <div className="sub">確率・期待値・結果検証で競艇を分析</div>
      </div>
      <div className="badge">本日 {today}</div>
    </header>
  );
}
