import Link from 'next/link';
import { getRacesByVenue } from '@/services/boatrace/client';

export default async function VenuePage({ params }: { params: { venueId: string } }) {
  const races = await getRacesByVenue(params.venueId);
  const venueName = races[0]?.venueName ?? params.venueId;
  return (
    <main className="container">
      <div className="section-title"><h2>{venueName} レース一覧</h2><span className="muted">1R〜12R</span></div>
      <div className="grid grid-3">
        {races.map((race) => (
          <Link className="card" href={`/race/${race.id}`} key={race.id}>
            <span className="badge">締切 {race.deadline}</span>
            <h3>{race.raceNo}R</h3>
            <p className="muted">{race.title}</p>
            <p className="muted">風 {race.weather.windSpeed}m / 波 {race.weather.waveHeight}cm</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
