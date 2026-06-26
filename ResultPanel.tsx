import { Probability } from '@/lib/types';
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
export function ProbabilityTable({ rows }: { rows: Probability[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>順位</th><th>艇</th><th>選手</th><th>AIスコア</th><th>1着率</th><th>2着以内</th><th>3着以内</th></tr></thead>
        <tbody>{rows.map((r, i) => <tr key={r.frame}><td>{i + 1}</td><td>{r.frame}</td><td>{r.name}</td><td>{r.score}</td><td>{pct(r.first)}</td><td>{pct(r.top2)}</td><td>{pct(r.top3)}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
