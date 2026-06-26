import type { BoatEntry } from '@/lib/types';

export function EntryTable({ entries }: { entries: BoatEntry[] }) {
  return (
    <div className="card">
      <h3>出走表</h3>
      <table className="table">
        <thead><tr><th>枠</th><th>選手</th><th>級</th><th>全国</th><th>当地</th><th>ST</th><th>モーター</th><th>展示</th></tr></thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.lane}>
              <td>{e.lane}</td><td>{e.racerName}</td><td>{e.className}</td><td>{e.nationalWinRate}</td><td>{e.localWinRate}</td><td>{e.averageStart}</td><td>{e.motorRate}%</td><td>{e.exhibitionTime}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
