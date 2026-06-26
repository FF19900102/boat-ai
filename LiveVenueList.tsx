import LiveVenueList from '@/components/client/LiveVenueList';

export default function LivePage() {
  return (
    <main className="container">
      <h1 className="title">ライブ更新</h1>
      <p className="muted">API経由で開催場を定期更新します。実データ接続後はここが速報画面になります。</p>
      <LiveVenueList />
    </main>
  );
}
