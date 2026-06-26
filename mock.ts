import type { TrifectaPrediction } from '@/lib/types';

export function ExpectedValueTable({ rows }: { rows: TrifectaPrediction[] }) {
  return (
    <div className="card">
      <h3>3連単 期待値ランキング</h3>
      <table className="table">
        <thead><tr><th>順位</th><th>買い目</th><th>確率</th><th>オッズ</th><th>期待値</th><th>判定</th></tr></thead>
        <tbody>
          {rows.slice(0, 15).map((r) => (
            <tr key={r.combination}>
              <td>{r.rank}</td><td>{r.combination}</td><td>{r.probability}%</td><td>{r.odds}</td><td className={r.expectedValue >= 120 ? 'green' : r.expectedValue >= 100 ? 'yellow' : 'muted'}>{r.expectedValue}</td><td>{r.decision}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
