'use client';
import { useMemo } from 'react';
import type { Racer, RaceWeather } from '@/lib/types';
import { generateTrifectaTickets } from '@/lib/ai';

type Props = {
  racers: Racer[];
  weather: RaceWeather;
  oddsMap: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
};

export function OddsInputPanel({ racers, weather, oddsMap, onChange }: Props) {
  const candidates = useMemo(() => generateTrifectaTickets(racers, weather).slice(0, 30), [racers, weather]);

  function setOdds(combination: string, value: string) {
    const odds = Number(value);
    const next = { ...oddsMap };
    if (!odds || odds <= 0) delete next[combination];
    else next[combination] = odds;
    onChange(next);
  }

  function clearAll() {
    onChange({});
  }

  const manualCount = Object.keys(oddsMap).length;

  return (
    <section className="card">
      <div className="section-title">
        <div>
          <h2>3連単オッズ入力</h2>
          <p className="small">実オッズを入れると期待値ランキングが自動で入れ替わります。未入力は推定オッズで計算します。</p>
        </div>
        <div className="row-actions">
          <span className="badge">入力済み {manualCount}件</span>
          <button className="btn ghost" onClick={clearAll}>オッズ削除</button>
        </div>
      </div>
      <div className="table-wrap compact-table">
        <table>
          <thead>
            <tr><th>買い目</th><th>AI確率</th><th>推定オッズ</th><th>実オッズ</th><th>実EV</th></tr>
          </thead>
          <tbody>
            {candidates.map((ticket) => {
              const manualOdds = oddsMap[ticket.combination] || 0;
              const ev = manualOdds > 0 ? ticket.probability * manualOdds * 100 : ticket.ev;
              return (
                <tr key={ticket.combination}>
                  <td><strong>{ticket.combination}</strong></td>
                  <td>{(ticket.probability * 100).toFixed(2)}%</td>
                  <td>{ticket.odds.toFixed(1)}</td>
                  <td>
                    <input
                      className="odds-input"
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="例 18.5"
                      value={manualOdds || ''}
                      onChange={(e) => setOdds(ticket.combination, e.target.value)}
                    />
                  </td>
                  <td className={ev >= 120 ? 'good' : ev >= 100 ? 'warn' : 'bad'}>{ev.toFixed(0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
