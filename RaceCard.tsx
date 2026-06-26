export default function DashboardPage() {
  return (
    <main className="container">
      <h1 className="title">成績ダッシュボード</h1>
      <div className="grid">
        <div className="card"><div className="muted">総投資</div><div className="kpi">0円</div></div>
        <div className="card"><div className="muted">総払戻</div><div className="kpi">0円</div></div>
        <div className="card"><div className="muted">回収率</div><div className="kpi">0%</div></div>
        <div className="card"><div className="muted">的中率</div><div className="kpi">0%</div></div>
      </div>
      <div className="card" style={{marginTop:16}}>
        次のステップで、購入記録・結果反映・競艇場別成績を保存できるようにします。
      </div>
    </main>
  );
}
