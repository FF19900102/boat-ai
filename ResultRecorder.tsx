import Link from 'next/link';
import { getTodayVenues } from '@/services/boatrace/client';

export default async function HomePage() {
  const venues = await getTodayVenues();
  return (
    <main className="container">
      <section className="hero">
        <span className="badge">Step20 / 実装版</span>
        <h1>Boat AI</h1>
        <p>開催場選択、レース選択、出走表、AI確率、3連単期待値ランキング、結果保存の土台まで入っています。</p>
        <Link href="/venues" className="button">本日の開催場を見る</Link>
      </section>
      <div className="section-title"><h2>本日開催</h2><span className="muted">{venues.length}場</span></div>
      <div className="grid grid-3">
        {venues.map((venue) => (
          <Link className="card" href={`/venues/${venue.id}`} key={venue.id}>
            <span className="badge">{venue.area}</span>
            <h3>{venue.name}</h3>
            <p className="muted">水質：{venue.water}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
