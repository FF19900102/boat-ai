import PollingStatusPanel from '@/components/client/PollingStatusPanel';

export default function LivePage() {
  return (
    <main className="container">
      <h1 className="title">ライブ監視</h1>
      <p className="muted">15秒ごとにAPI状態を確認します。実データ接続後は速報監視画面になります。</p>
      <PollingStatusPanel />
    </main>
  );
}
