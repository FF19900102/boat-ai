'use client';
import { venues, todayVenueIds } from '@/lib/data';

export function VenueSelector({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  const todays = venues.filter((v) => todayVenueIds.includes(v.id));
  return (
    <div className="grid venue-grid">
      {todays.map((v) => (
        <button key={v.id} className={`card btn secondary ${selected === v.id ? 'active' : ''}`} onClick={() => onSelect(v.id)}>
          <div style={{ fontSize: 20 }}>{v.name}</div>
          <div className="muted" style={{ color: selected === v.id ? 'white' : undefined }}>{v.region}{v.night ? '・ナイター' : ''}</div>
        </button>
      ))}
    </div>
  );
}
