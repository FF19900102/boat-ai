import Link from 'next/link';

export default function ToolsPage() {
  return (
    <>
      <div className="section-title"><h2>開発ツール</h2><span className="badge">Step 14</span></div>
      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>今使える機能</h3>
          <p className="sub">開催場、レース、AI確率、3連単120通り、オッズ手入力、期待値、資金配分、結果保存、成績分析。</p>
          <div style={{ height: 12 }} />
          <Link className="btn" href="/venue">レースを選ぶ</Link>
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>次に入れる機能</h3>
          <p className="sub">出走表自動取得のアダプター、結果速報の取り込み、CSV/JSONでの一括データ学習、AI重み調整。</p>
          <div style={{ height: 12 }} />
          <Link className="btn subtle" href="/learning">AI学習を見る</Link>
        </div>
      </div>
    </>
  );
}
