'use client';

import { useEffect, useMemo, useState } from 'react';
import type { SavedResult } from '@/lib/types';
import { clearResults, loadResults } from '@/lib/storage';

export default function DashboardPage() {
  const [results, setResults] = useState<SavedResult[]>([]);
  useEffect(() => setResults(loadResults()), []);
  const stats = useMemo(() => {
    const bet = results.reduce((s, r) => s + r.betAmount, 0);
    const payout = results.reduce((s, r) => s + r.payout, 0);
    const profit = results.reduce((s, r) => s + r.profit, 0);
    const hit = results.filter(r => r.hit).length;
    return { bet, payout, profit, hitRate: results.length ? hit / results.length : 0, roi: bet ? payout / bet : 0 };
  }, [results]);

  function handleClear() {
    clearResults();
    setResults([]);
  }

  return (
    <>
      <div className="section-title"><h2>成績ダッシュボード</h2><button className="btn subtle" onClick={handleClear}>保存データ削除</button></div>
      <div className="grid grid-4">
        <div className="card kpi"><span>投資</span><strong>{stats.bet.toLocaleString()}円</strong></div>
        <div className="card kpi"><span>払戻</span><strong>{stats.payout.toLocaleString()}円</strong></div>
        <div className="card kpi"><span>収支</span><strong className={stats.profit >= 0 ? 'good' : 'bad'}>{stats.profit.toLocaleString()}円</strong></div>
        <div className="card kpi"><span>回収率</span><strong>{(stats.roi * 100).toFixed(1)}%</strong></div>
      </div>
      <div className="section-title"><h2>保存レース</h2><span className="badge">{results.length}件</span></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>日付</th><th>場</th><th>R</th><th>購入</th><th>結果</th><th>投資</th><th>払戻</th><th>収支</th></tr></thead>
          <tbody>{results.map(r => <tr key={r.id}><td>{new Date(r.date).toLocaleString('ja-JP')}</td><td>{r.venueName}</td><td>{r.raceNo}R</td><td>{r.betCombination}</td><td>{r.resultCombination}</td><td>{r.betAmount.toLocaleString()}</td><td>{r.payout.toLocaleString()}</td><td className={r.profit >= 0 ? 'good' : 'bad'}>{r.profit.toLocaleString()}</td></tr>)}</tbody>
        </table>
      </div>
    </>
  );
}
