import type { BoatProbability } from '@/lib/types';
import { pct } from '@/lib/format';

export function ProbabilityTable({ rows }: { rows: BoatProbability[] }) {
  return (
    <div className="card">
      <h3>AI確率</h3>
      <table className="table">
        <thead><tr><th>順位</th><th>枠</th><th>選手</th><th>1着</th><th>2連対</th><th>3連対</th><th>評価</th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.lane}>
              <td>{i + 1}</td><td>{r.lane}</td><td>{r.racerName}</td><td className="green">{pct(r.firstRate)}</td><td>{pct(r.top2Rate)}</td><td>{pct(r.top3Rate)}</td><td>{r.comment}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
