import { Prediction } from '@/lib/types';

export function PredictionTable({ predictions }: { predictions: Prediction[] }) {
  return (
    <div className="panel">
      <h2>AI確率</h2>
      <table>
        <thead>
          <tr>
            <th>艇</th>
            <th>選手</th>
            <th>スコア</th>
            <th>1着率</th>
            <th>2着以内</th>
            <th>3着以内</th>
          </tr>
        </thead>
        <tbody>
          {predictions.map((p) => (
            <tr key={p.lane}>
              <td>{p.lane}</td>
              <td>{p.name}</td>
              <td>{p.score}</td>
              <td>{p.firstRate}%</td>
              <td>{p.top2Rate}%</td>
              <td>{p.top3Rate}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
