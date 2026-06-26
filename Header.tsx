import { VenueCard } from '@/components/VenueCard';
import { venues } from '@/lib/mockData';

export default function VenuePage() {
  return (
    <>
      <div className="section-title"><h2>本日開催場</h2><span className="badge">手動データ / API接続前</span></div>
      <div className="grid grid-2">{venues.map(v => <VenueCard key={v.id} venue={v} />)}</div>
    </>
  );
}
