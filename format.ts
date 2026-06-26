import Link from 'next/link';
import { Venue } from '@/lib/types';

export default function VenueCard({ venue }: { venue: Venue }) {
  return (
    <Link href={`/venues?venue=${venue.id}`} className="card">
      <div style={{display:'flex', justifyContent:'space-between', gap:12}}>
        <div>
          <h3 style={{margin:'0 0 8px', fontSize:22}}>{venue.name}</h3>
          <p className="muted" style={{margin:0}}>{venue.region}</p>
        </div>
        <span className="badge">{venue.isOpenToday ? '本日開催' : '休み'}</span>
      </div>
      <div style={{marginTop:14, display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8}}>
        <div><div className="muted">風</div><b>{venue.weather.windSpeed}m</b></div>
        <div><div className="muted">波</div><b>{venue.weather.waveHeight}cm</b></div>
        <div><div className="muted">天候</div><b>{venue.weather.condition}</b></div>
      </div>
    </Link>
  );
}
