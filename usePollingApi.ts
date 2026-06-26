'use client';

import Link from 'next/link';
import { usePollingApi } from '@/hooks/usePollingApi';
import { Venue } from '@/lib/types';

export default function LiveVenueList() {
  const { data, error, loading, updatedAt } = usePollingApi<Venue[]>('/api/venues', 60000);

  if (loading && !data) return <div className="card">開催場を取得中...</div>;
  if (error) return <div className="card bad">取得エラー: {error}</div>;

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>ライブ開催場</h2>
        <span className="muted">更新: {updatedAt ? updatedAt.toLocaleTimeString('ja-JP') : '-'}</span>
      </div>
      <div className="grid">
        {(data ?? []).map((venue) => (
          <Link key={venue.id} href={`/venues?venue=${venue.id}`} className="card">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0 }}>{venue.name}</h3>
              <span className="badge">{venue.isOpenToday ? '開催' : '休み'}</span>
            </div>
            <p className="muted">{venue.region}</p>
            <p className="muted">
              {venue.weather.condition} / {venue.weather.windDirection}
              {venue.weather.windSpeed}m / 波{venue.weather.waveHeight}cm
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
