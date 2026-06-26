'use client';
import { useEffect, useMemo, useState } from 'react';
import type { Racer, RaceWeather, SavedRace } from '@/lib/types';
import { generateTrifectaTickets } from '@/lib/ai';
import type { ResultPayload } from '@/services/boatDataClient';

type Props = {
  venue: string;
  raceNo: number;
  racers: Racer[];
  weather: RaceWeather;
  fetchedResult?: ResultPayload | null;
  oddsMap?: Record<string, number>;
};

export function ResultPanel({ venue, raceNo, racers, weather, fetchedResult, oddsMap = {} }: Props) {
  const [first, setFirst] = useState(1);
  const [second, setSecond] = useState(2);
  const [third, setThird] = useState(3);
  const [payout, setPayout] = useState(0);
  const [betAmount, setBetAmount] = useState(1000);
  const [message, setMessage] = useState('');
  const tickets = useMemo(() => generateTrifectaTickets(racers, weather, oddsMap).slice(0, 5), [racers, weather, oddsMap]);

  useEffect(() => {
    if (fetchedResult?.status === 'confirmed' && fetchedResult.first && fetchedResult.second && fetchedResult.third) {
      setFirst(fetchedResult.first);
      setSecond(fetchedResult.second);
      setThird(fetchedResult.third);
      setPayout(fetchedResult.payout || 0);
      setMessage(`速報取得：${fetchedResult.combination} / ${Number(fetchedResult.payout || 0).toLocaleString()}円`);
    } else if (fetchedResult?.status === 'pending') {
      setMessage('速報：まだ結果待ちです');
    }
  }, [fetchedResult]);

  function save() {
    const resultCombo = `${first}-${second}-${third}`;
    const hit = tickets.some((t) => t.combination === resultCombo);
    const profit = hit ? payout - betAmount : -betAmount;
    const race: SavedRace = {
      id: `${Date.now()}`,
      date: new Date().toISOString(),
      venue,
      raceNo,
      racers,
      weather,
      tickets,
      result: { first, second, third, payout, betAmount, hit, profit }
    };
    const old = JSON.parse(localStorage.getItem('boat-ai-races') || '[]') as SavedRace[];
    localStorage.setItem('boat-ai-races', JSON.stringify([race, ...old].slice(0, 500)));
    window.dispatchEvent(new Event('boat-ai-storage-updated'));
    setMessage(hit ? `的中 +${profit.toLocaleString()}円` : `不的中 ${profit.toLocaleString()}円`);
  }

  return (
    <section className="card">
      <h2>結果入力・保存</h2>
      <div className="grid grid-3">
        <label>1着<input type="number" min="1" max="6" value={first} onChange={(e) => setFirst(Number(e.target.value))} /></label>
        <label>2着<input type="number" min="1" max="6" value={second} onChange={(e) => setSecond(Number(e.target.value))} /></label>
        <label>3着<input type="number" min="1" max="6" value={third} onChange={(e) => setThird(Number(e.target.value))} /></label>
        <label>払戻金<input type="number" value={payout} onChange={(e) => setPayout(Number(e.target.value))} /></label>
        <label>投資額<input type="number" value={betAmount} onChange={(e) => setBetAmount(Number(e.target.value))} /></label>
        <button className="btn" onClick={save}>結果を保存</button>
      </div>
      {fetchedResult && <p className="small">速報元：{fetchedResult.source}</p>}
      {message && <p className="badge">{message}</p>}
    </section>
  );
}
