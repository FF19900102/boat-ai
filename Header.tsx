import { DashboardClient } from '@/components/dashboard/DashboardClient';

export default function DashboardPage() {
  return (
    <main className="container">
      <div className="section-title"><h2>成績ダッシュボード</h2><span className="muted">localStorage保存</span></div>
      <DashboardClient />
    </main>
  );
}
