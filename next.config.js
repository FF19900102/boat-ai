import { Entry } from '@/lib/types';

export default function EntryTable({ entries }: { entries: Entry[] }) {
  return (
    <div className="card">
      <h2>出走表</h2>
      <table className="table">
        <thead>
          <tr><th>艇</th><th>選手</th><th>級</th><th>全国</th><th>当地</th><th>Motor</th><th>Boat</th><th>ST</th><th>展示</th><th>体重</th></tr>
        </thead>
        <tbody>
          {entries.map(e => (
            <tr key={e.lane}>
              <td>{e.lane}</td>
              <td>{e.racerName}</td>
              <td>{e.className}</td>
              <td>{e.nationalWinRate}</td>
              <td>{e.localWinRate}</td>
              <td>{e.motorRate}%</td>
              <td>{e.boatRate}%</td>
              <td>{e.avgStart}</td>
              <td>{e.exhibitionTime}</td>
              <td>{e.weight}kg</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
