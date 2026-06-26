'use client';
import type { Racer, RaceWeather, Ticket } from '@/lib/types';
import { generateTrifectaTickets, verdict, winProbabilities } from '@/lib/ai';

export function PredictionPanel({ racers, weather }: { racers: Racer[]; weather: RaceWeather }) {
  const probs = winProbabilities(racers, weather).sort((a, b) => b.probability - a.probability);
  const tickets = generateTrifectaTickets(racers, weather).slice(0, 20);
  const decision = verdict(tickets as Ticket[]);

  return (
    <section className="grid grid-2">
      <div className="card">
        <h2>AI判定</h2>
        <div className="kpi">
          <span className={decision.label === '購入候補' ? 'good' : decision.label === '見送り' ? 'bad' : 'warn'}>{decision.label}</span>
          <strong>{decision.detail}</strong>
          <div className="small">現在は数式AI。後でLightGBMに差し替え可能。</div>
        </div>
      </div>
      <div className="card">
        <h2>1着確率</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>艇</th><th>選手</th><th>確率</th><th>スコア</th></tr></thead>
            <tbody>
              {probs.map((p) => {
                const r = racers.find((x) => x.lane === p.lane)!;
                return <tr key={p.lane}><td>{p.lane}</td><td>{r.name}</td><td>{(p.probability * 100).toFixed(1)}%</td><td>{p.score.toFixed(1)}</td></tr>;
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card" style={{ gridColumn: '1 / -1' }}>
        <h2>3連単 期待値ランキング TOP20</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>買い目</th><th>的中確率</th><th>推定オッズ</th><th>期待値</th><th>判定</th></tr></thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.combination}>
                  <td><strong>{t.combination}</strong></td>
                  <td>{(t.probability * 100).toFixed(2)}%</td>
                  <td>{t.odds.toFixed(1)}</td>
                  <td className={t.ev >= 120 ? 'good' : t.ev >= 100 ? 'warn' : 'bad'}>{t.ev.toFixed(0)}</td>
                  <td>{t.rank === 'BUY' ? '買い候補' : t.rank === 'WATCH' ? '注意' : '見送り'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
