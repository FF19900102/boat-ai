import type { RacerPrediction } from '@/lib/types';
import { formatPercent } from '@/lib/aiEngine';

export function PredictionTable({ predictions }: { predictions: RacerPrediction[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>艇</th><th>選手</th><th>級</th><th>AIスコア</th><th>1着率</th><th>2連対</th><th>3連対</th><th>展示</th><th>ST</th><th>モーター</th>
          </tr>
        </thead>
        <tbody>
          {predictions.map(r => (
            <tr key={r.boatNo}>
              <td><span className={`boat-no boat-${r.boatNo}`}>{r.boatNo}</span></td>
              <td><b>{r.name}</b></td>
              <td>{r.className}</td>
              <td>{r.score.toFixed(1)}</td>
              <td><b>{formatPercent(r.firstRate)}</b></td>
              <td>{formatPercent(r.top2Rate)}</td>
              <td>{formatPercent(r.top3Rate)}</td>
              <td>{r.exhibitionTime}</td>
              <td>{r.avgSt}</td>
              <td>{r.motor2Rate}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
