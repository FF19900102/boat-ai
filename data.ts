'use client';
import { SavedResult, Venue } from '@/lib/types';
import { useMemo, useState } from 'react';

export function ResultPanel({ venue, raceNo, topCombo }: { venue: Venue; raceNo: number; topCombo: string }) {
  const [result, setResult] = useState('');
  const [investment, setInvestment] = useState(1000);
  const [payout, setPayout] = useState(0);
  const [memo, setMemo] = useState('');
  const [saved, setSaved] = useState<SavedResult[]>(() => {
    if (typeof window === 'undefined') return [];
    return JSON.parse(localStorage.getItem('boat-ai-results') || '[]');
  });
  const hit = result.trim() !== '' && result.trim() === topCombo;
  const profit = payout - investment;
  const total = useMemo(() => saved.reduce((a, r) => ({ investment: a.investment + r.investment, payout: a.payout + r.payout, hit: a.hit + (r.hit ? 1 : 0) }), { investment: 0, payout: 0, hit: 0 }), [saved]);
  const roi = total.investment ? (total.payout / total.investment * 100).toFixed(1) : '0.0';

  function save() {
    const row: SavedResult = { id: crypto.randomUUID(), venueId: venue.id, venueName: venue.name, raceNo, date: new Date().toISOString().slice(0,10), result, hit, investment, payout, profit, memo };
    const next = [row, ...saved];
    setSaved(next);
    localStorage.setItem('boat-ai-results', JSON.stringify(next));
  }
  function clearAll() {
    if (!confirm('保存結果を削除しますか？')) return;
    setSaved([]); localStorage.removeItem('boat-ai-results');
  }
  return (
    <div className="grid">
      <div className="kpi">
        <div className="card">保存レース<strong>{saved.length}</strong></div>
        <div className="card">的中率<strong>{saved.length ? (total.hit / saved.length * 100).toFixed(1) : '0.0'}%</strong></div>
        <div className="card">回収率<strong>{roi}%</strong></div>
        <div className="card">総収支<strong>{(total.payout - total.investment).toLocaleString()}円</strong></div>
      </div>
      <div className="card">
        <div className="section-title" style={{ marginTop: 0 }}>結果入力</div>
        <div className="row">
          <div style={{ flex: 1 }}><label>確定3連単</label><input placeholder="例 1-3-2" value={result} onChange={(e) => setResult(e.target.value)} /></div>
          <div style={{ flex: 1 }}><label>投資額</label><input type="number" value={investment} onChange={(e) => setInvestment(Number(e.target.value))} /></div>
          <div style={{ flex: 1 }}><label>払戻金</label><input type="number" value={payout} onChange={(e) => setPayout(Number(e.target.value))} /></div>
          <div style={{ flex: 2 }}><label>メモ</label><input value={memo} onChange={(e) => setMemo(e.target.value)} /></div>
        </div>
        <p>推奨1位：<strong>{topCombo}</strong> ／ 判定：<strong>{result ? hit ? '的中' : '不的中' : '未入力'}</strong> ／ 収支：<strong>{profit.toLocaleString()}円</strong></p>
        <div className="row"><button className="btn" onClick={save}>結果を保存</button><button className="btn danger" onClick={clearAll}>全削除</button></div>
      </div>
    </div>
  );
}
