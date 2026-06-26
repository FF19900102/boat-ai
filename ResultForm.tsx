import { BoatProbability } from "@/lib/types";

export function ProbabilityTable({ rows }: { rows: BoatProbability[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <table className="w-full">
        <thead><tr><th className="th">順位</th><th className="th">艇</th><th className="th">選手</th><th className="th">1着率</th><th className="th">2着以内</th><th className="th">3着以内</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.lane}>
              <td className="td font-black">{r.rank}</td>
              <td className="td font-black">{r.lane}</td>
              <td className="td">{r.racerName}</td>
              <td className="td font-bold">{(r.firstRate * 100).toFixed(1)}%</td>
              <td className="td">{(r.top2Rate * 100).toFixed(1)}%</td>
              <td className="td">{(r.top3Rate * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
