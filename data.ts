import Link from 'next/link';
import Header from '@/components/Header';
import { getVenue, races } from '@/lib/data';

export default function RaceList({ params }: { params: { venue: string } }) {
  const venue = getVenue(params.venue);
  return (
    <>
      <Header />
      <main className="wrap">
        <Link href="/" className="btn">← 開催場へ戻る</Link>
        <div className="section">
          <h1 className="title">{venue.name}</h1>
          <p className="muted">レースを選択してください</p>
        </div>
        <section className="section race-grid">
          {races.map((race) => (
            <Link key={race.no} className="race" href={`/race/${venue.id}/${race.no}`}>
              {race.no}R
            </Link>
          ))}
        </section>
      </main>
    </>
  );
}
