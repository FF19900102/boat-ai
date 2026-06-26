import type { TrifectaPrediction } from '@/lib/types';
import { formatPercent } from '@/lib/aiEngine';

export function TrifectaTable({ items }: { items: TrifectaPrediction[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>順位</th><th>買い目</th><th>的中確率</th><th>推定オッズ</th><th>期待値</th><th>判定</th></tr></thead>
        <tbody>
          {items.slice(0, 30).map((item, idx) => (
            <tr key={item.combination}>
              <td>{idx + 1}</td>
              <td><b>{item.combination}</b></td>
              <td>{formatPercent(item.probability, 2)}</td>
              <td>{item.odds.toFixed(1)}倍</td>
              <td className={item.expectedValue >= 120 ? 'good' : item.expectedValue >= 100 ? 'warn' : 'bad'}><b>{item.expectedValue.toFixed(1)}</b></td>
              <td>{item.judge}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
