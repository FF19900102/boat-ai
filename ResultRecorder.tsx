import { strategyLabels, strategyIds } from '@/lib/strategyEngine';

export default function LearningPage() {
  return (
    <>
      <div className="section-title"><h2>AI学習ロードマップ</h2><span className="badge">Step 13</span></div>
      <div className="grid grid-2">
        {strategyIds.map(id => (
          <div className="card" key={id}>
            <h3 style={{ marginTop: 0 }}>{strategyLabels[id].name}</h3>
            <p className="sub">{strategyLabels[id].description}</p>
            <div style={{ height: 12 }} />
            <span className="badge">今後：結果保存から重み調整</span>
          </div>
        ))}
      </div>
      <div className="section-title"><h2>次に接続するデータ</h2></div>
      <div className="card">
        <div className="grid grid-4">
          <div className="kpi"><span>出走表</span><strong>API化</strong></div>
          <div className="kpi"><span>展示</span><strong>速報</strong></div>
          <div className="kpi"><span>オッズ</span><strong>自動/手動</strong></div>
          <div className="kpi"><span>結果</span><strong>自動反映</strong></div>
        </div>
      </div>
    </>
  );
}
