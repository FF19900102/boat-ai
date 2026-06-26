export default function SettingsPage() {
  return (
    <main className="container">
      <h1 className="title">AI設定</h1>
      <div className="card">
        <p className="muted">次のバージョンでAI重み調整を画面から変更できるようにします。</p>
        <ul>
          <li>全国勝率重み</li>
          <li>当地勝率重み</li>
          <li>モーター重み</li>
          <li>展示タイム重み</li>
          <li>風・波補正</li>
        </ul>
      </div>
    </main>
  );
}
