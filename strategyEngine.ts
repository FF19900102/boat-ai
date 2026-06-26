import type { StrategyScore } from '@/lib/types';

export function StrategyPanel({ strategies, comments }: { strategies: StrategyScore[]; comments: string[] }) {
  const best = strategies[0];
  return (
    <div className="card">
      <div className="section-title" style={{ marginTop: 0 }}>
        <h2>AI監督</h2>
        <span className="badge">採用AI：{best?.name}</span>
      </div>
      {best && (
        <div className="grid grid-3">
          <div className="kpi"><span>信頼度</span><strong>{best.confidence.toFixed(1)}%</strong></div>
          <div className="kpi"><span>最上位買い目</span><strong>{best.topCombination}</strong></div>
          <div className="kpi"><span>期待値</span><strong>{best.expectedValue.toFixed(1)}</strong></div>
        </div>
      )}
      <div style={{ height: 12 }} />
      {comments.map((c, i) => <div className="alert" style={{ marginTop: i ? 8 : 0 }} key={c}>{c}</div>)}
      <div style={{ height: 12 }} />
      <div className="table-wrap">
        <table>
          <thead><tr><th>AI</th><th>説明</th><th>信頼度</th><th>1位買い目</th><th>期待値</th></tr></thead>
          <tbody>
            {strategies.map(s => (
              <tr key={s.id}>
                <td><b>{s.name}</b></td>
                <td>{s.description}</td>
                <td>{s.confidence.toFixed(1)}%</td>
                <td>{s.topCombination}</td>
                <td className={s.expectedValue >= 120 ? 'good' : s.expectedValue >= 100 ? 'warn' : 'bad'}><b>{s.expectedValue.toFixed(1)}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
