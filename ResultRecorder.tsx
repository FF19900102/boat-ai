import Link from 'next/link';
import { venues } from '@/lib/mockData';
import { VenueCard } from '@/components/VenueCard';

export default function HomePage() {
  const openCount = venues.filter(v => v.isOpen).length;
  return (
    <>
      <section className="hero">
        <div className="card">
          <span className="badge">Boat AI Step 12</span>
          <h1 className="title">確率・期待値・結果検証で戦う競艇AI</h1>
          <p className="sub">開催場選択、レース選択、出走表、AI確率、3連単120通り、期待値ランキング、結果保存まで入れた実装版です。</p>
          <div style={{marginTop: 18, display:'flex', gap: 10, flexWrap:'wrap'}}>
            <Link className="btn" href="/venue">本日開催を見る</Link>
            <Link className="btn subtle" href="/dashboard">成績を見る</Link>
          </div>
        </div>
        <div className="card grid grid-2">
          <div className="kpi"><span>本日開催</span><strong>{openCount}場</strong></div>
          <div className="kpi"><span>対応レース</span><strong>{openCount * 12}R</strong></div>
          <div className="kpi"><span>3連単</span><strong>120通り</strong></div>
          <div className="kpi"><span>保存</span><strong>可能</strong></div>
        </div>
      </section>
      <div className="section-title"><h2>開催場</h2><Link href="/venue" className="badge">全部見る</Link></div>
      <div className="grid grid-3">{venues.filter(v => v.isOpen).map(v => <VenueCard key={v.id} venue={v} />)}</div>
    </>
  );
}
