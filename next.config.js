'use client';
import type { Racer, RaceWeather } from '@/lib/types';
import { runStrategyLeague } from '@/lib/strategies';

export function AiLeaguePanel({ racers, weather }: { racers: Racer[]; weather: RaceWeather }) {
  const league = runStrategyLeague(racers, weather);
  const leader = league[0];

  return (
    <section className="card">
      <div className="section-title">
        <div>
          <h2>AIリーグ戦</h2>
          <p className="small">5種類のAIで同じレースを判定。現時点で強い作戦を上に表示します。</p>
        </div>
        <div className="badge">採用候補：{leader?.name || '--'}</div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>順位</th><th>AI</th><th>狙い</th><th>本線</th><th>EV</th><th>信頼度</th><th>判定</th></tr>
          </thead>
          <tbody>
            {league.map((item, index) => (
              <tr key={item.key}>
                <td>{index + 1}</td>
                <td><strong>{item.name}</strong></td>
                <td>{item.summary}</td>
                <td>{item.topTicket.combination}</td>
                <td className={item.topTicket.ev >= 120 ? 'good' : item.topTicket.ev >= 100 ? 'warn' : 'bad'}>{item.topTicket.ev.toFixed(0)}</td>
                <td>{item.confidence.toFixed(0)}%</td>
                <td>{item.topTicket.rank === 'BUY' ? '買い候補' : item.topTicket.rank === 'WATCH' ? '注意' : '見送り'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
