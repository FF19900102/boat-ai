import Link from 'next/link';
import { Venue } from '@/lib/data';

export default function VenueCard({ venue }: { venue: Venue }) {
  return (
    <Link className="venue" href={`/race/${venue.id}`}>
      <div className="card">
        <span className="badge">{venue.status}</span>
        <h2>{venue.name}</h2>
        <p className="muted">{venue.area}</p>
      </div>
    </Link>
  );
}
