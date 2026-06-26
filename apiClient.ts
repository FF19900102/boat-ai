'use client';

import { usePollingApi } from '@/hooks/usePollingApi';
import { Race } from '@/lib/types';

export default function LiveRaceStatus({ raceId }: { raceId: string }) {
  const { data, error, loading, updatedAt } = usePollingApi<Race>(`/api/races/${raceId}`, 20000);

  if (loading && !data) return <div className="card">レース情報更新中...</div>;
  if (error) return <div className="card bad">レース取得エラー: {error}</div>;
  if (!data) return null;

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>ライブ状態</h2>
        <span className="badge">{data.status}</span>
      </div>
      <p className="muted">締切 {data.deadline}</p>
      <p className="muted">最終更新: {updatedAt ? updatedAt.toLocaleTimeString('ja-JP') : '-'}</p>
    </div>
  );
}
