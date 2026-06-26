import Link from 'next/link';
import type { Venue } from '@/lib/types';

export function VenueCard({ venue }: { venue: Venue }) {
  return (
    <Link className="card venue" href={`/race/${venue.id}`}>
      <div>
        <div className="venue-name">{venue.name}</div>
        <div className="venue-meta">{venue.region} / {venue.water}</div>
        <div className="venue-meta">{venue.bias}</div>
      </div>
      <div>
        <span className="badge">{venue.isOpen ? '本日開催' : '非開催'}</span>
      </div>
    </Link>
  );
}
