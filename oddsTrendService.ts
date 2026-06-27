import OddsTrendPanel from '@/components/client/OddsTrendPanel';

export default function AdminOddsPage() {
  return (
    <main className="container">
      <h1 className="title">オッズ変動分析</h1>
      <OddsTrendPanel />
    </main>
  );
}
