'use client';
import type { Venue } from '@/lib/types';

export function VenueSelector({ venues, selected, onSelect }: { venues: Venue[]; selected: string; onSelect: (id: string) => void }) {
  return (
    <section className="card">
      <h2>本日開催場</h2>
      <div className="grid grid-3">
        {venues.map((venue) => (
          <button key={venue.id} className={`card venue ${selected === venue.id ? 'active' : ''}`} onClick={() => onSelect(venue.id)}>
            <strong>{venue.name}</strong>
            <div className="small">{venue.region}{venue.night ? ' / ナイター' : ''}</div>
          </button>
        ))}
      </div>
    </section>
  );
}
