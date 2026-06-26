'use client';
import { useEffect, useState } from 'react';
import type { SavedRace } from '@/lib/types';

export function Dashboard() {
  const [races, setRaces] = useState<SavedRace[]>([]);
  useEffect(() => {
    setRaces(JSON.parse(localStorage.getItem('boat-ai-races') || '[]'));
  }, []);
  const totalBet = races.reduce((s, r) => s + (r.result?.betAmount || 0), 0);
  const totalPayout = races.reduce((s, r) => s + (r.result?.hit ? r.result.payout : 0), 0);
  const hits = races.filter((r) => r.result?.hit).length;
  const roi = totalBet ? (totalPayout / totalBet) * 100 : 0;

  return (
    <section className="card">
      <h2>成績ダッシュボード</h2>
      <div className="grid grid-3">
        <div className="kpi"><span className="small">保存レース</span><strong>{races.length}</strong></div>
        <div className="kpi"><span className="small">的中率</span><strong>{races.length ? ((hits / races.length) * 100).toFixed(1) : '0.0'}%</strong></div>
        <div className="kpi"><span className="small">回収率</span><strong className={roi >= 100 ? 'good' : 'bad'}>{roi.toFixed(1)}%</strong></div>
      </div>
      <div className="table-wrap" style={{ marginTop: 14 }}>
        <table>
          <thead><tr><th>日付</th><th>場</th><th>R</th><th>結果</th><th>収支</th></tr></thead>
          <tbody>
            {races.slice(0, 10).map((r) => <tr key={r.id}><td>{new Date(r.date).toLocaleString('ja-JP')}</td><td>{r.venue}</td><td>{r.raceNo}R</td><td>{r.result?.first}-{r.result?.second}-{r.result?.third}</td><td className={(r.result?.profit || 0) >= 0 ? 'good' : 'bad'}>{r.result?.profit.toLocaleString()}円</td></tr>)}
          </tbody>
        </table>
      </div>
    </section>
  );
}
