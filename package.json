'use client';

type Props = {
  source: string;
  updatedAt: string;
  loading: boolean;
  onReload: () => void;
  onFetchResult: () => void;
};

export function AutoSyncPanel({ source, updatedAt, loading, onReload, onFetchResult }: Props) {
  return (
    <section className="card sync-card">
      <div>
        <h2>データ取得</h2>
        <p className="small">今はモックAPI。ここを公式サイト取得・有料API・DBへ差し替えます。</p>
        <p className="small">source: {source || '未取得'}</p>
        <p className="small">updated: {updatedAt ? new Date(updatedAt).toLocaleString('ja-JP') : '--'}</p>
      </div>
      <div className="sync-actions">
        <button className="btn" onClick={onReload} disabled={loading}>{loading ? '取得中...' : '出走表を取得'}</button>
        <button className="btn secondary" onClick={onFetchResult} disabled={loading}>結果速報を確認</button>
      </div>
    </section>
  );
}
