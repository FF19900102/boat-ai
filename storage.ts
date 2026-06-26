import Link from 'next/link';
import type { Race } from '@/lib/types';

export function RaceCard({ race }: { race: Race }) {
  return (
    <Link className="race-card" href={`/race/${race.venueId}/${race.raceNo}`}>
      <strong>{race.raceNo}R</strong>
      <span>{race.deadline}</span>
      <div className="venue-meta">{race.title}</div>
    </Link>
  );
}
