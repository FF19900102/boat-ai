import { Prediction } from '@/lib/types';
import { percent } from '@/lib/format';

export default function PredictionTable({ predictions }: { predictions: Prediction[] }) {
  return (
    <div className="card">
      <h2>AI確率</h2>
      <table className="table">
        <thead><tr><th>艇</th><th>評価</th><th>スコア</th><th>1着</th><th>2連対</th><th>3連対</th></tr></thead>
        <tbody>
          {predictions.map(p => (
            <tr key={p.lane}>
              <td>{p.lane}号艇</td>
              <td>{p.label}</td>
              <td>{p.score.toFixed(1)}</td>
              <td>{percent(p.firstRate)}</td>
              <td>{percent(p.top2Rate)}</td>
              <td>{percent(p.top3Rate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
