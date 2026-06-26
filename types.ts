import Link from 'next/link';
export default function Header(){return <div className="header"><div><div className="brand">Boat AI</div><div className="sub">確率・期待値・結果検証で競艇を分析</div></div><div className="row"><Link className="btn" href="/">ホーム</Link><Link className="btn" href="/dashboard">成績</Link></div></div>}
