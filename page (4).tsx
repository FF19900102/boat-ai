import Link from 'next/link';
import { getTodayVenues } from '@/services/boatrace/client';

export default async function VenuesPage() {
  const venues = await getTodayVenues();
  return (
    <main className="container">
      <div className="section-title"><h2>本日の開催場</h2><span className="muted">自動取得接続前のモック</span></div>
      <div className="grid grid-3">
        {venues.map((venue) => (
          <Link className="card" href={`/venues/${venue.id}`} key={venue.id}>
            <h3>{venue.name}</h3>
            <p className="muted">{venue.area} / {venue.water}</p>
            <span className="button">レース一覧</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
