import DbBetManager from '@/components/client/DbBetManager';

export default function AdminBetsPage() {
  return (
    <main className="container">
      <h1 className="title">DB購入履歴 管理</h1>
      <p className="muted">
        v2.2ではAPI経由で購入履歴を管理します。次のv2.3でPrisma保存へ切り替えます。
      </p>
      <DbBetManager />
    </main>
  );
}
