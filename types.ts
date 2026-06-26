'use client';
import { Bet } from '@/lib/types';
const pct = (n: number) => `${(n * 100).toFixed(2)}%`;
export function BetTable({ bets, oddsMap, onOddsChange }: { bets: Bet[]; oddsMap: Record<string, number>; onOddsChange: (combo: string, odds: number) => void }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>順位</th><th>買い目</th><th>的中確率</th><th>オッズ</th><th>期待値</th><th>判定</th></tr></thead>
        <tbody>{bets.slice(0, 30).map((b, i) => <tr key={b.combo}>
          <td>{i + 1}</td><td><strong>{b.combo}</strong></td><td>{pct(b.probability)}</td>
          <td style={{ width: 120 }}><input type="number" step="0.1" value={oddsMap[b.combo] ?? b.odds} onChange={(e) => onOddsChange(b.combo, Number(e.target.value))} /></td>
          <td><strong>{b.ev.toFixed(0)}</strong></td><td><span className={`badge ${b.ev >= 120 ? 'buy' : b.ev >= 100 ? 'warn' : 'skip'}`}>{b.judge}</span></td>
        </tr>)}</tbody>
      </table>
    </div>
  );
}
