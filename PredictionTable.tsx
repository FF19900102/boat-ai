import { Venue } from '@/lib/types';

export function VenueList({ venues, selectedVenueId, onSelect }: {
  venues: Venue[];
  selectedVenueId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid">
      {venues.filter((v) => v.isOpenToday).map((venue) => (
        <button
          key={venue.id}
          className={selectedVenueId === venue.id ? 'card active' : 'card'}
          onClick={() => onSelect(venue.id)}
        >
          <strong>{venue.name}</strong>
          <span>{venue.area}</span>
        </button>
      ))}
    </div>
  );
}
