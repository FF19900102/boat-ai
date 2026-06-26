import Link from 'next/link';
import { raceService } from '@/services/raceService';
import VenueCard from '@/components/VenueCard';

export default function HomePage() {
  const venues = raceService.listTodayVenues();

  return (
    <main className="container">
      <section className="card" style={{marginBottom:20}}>
        <h1 className="title">Boat AI</h1>
        <p className="muted">確率・期待値・結果検証で戦う競艇AI。まずは本日開催場からレースを選択してください。</p>
        <Link className="btn" href="/venues">開催場を選ぶ</Link>
      </section>
      <h2>本日開催</h2>
      <div className="grid">
        {venues.map(v => <VenueCard key={v.id} venue={v} />)}
      </div>
    </main>
  );
}
