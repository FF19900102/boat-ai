import PollingStatusPanel from '@/components/client/PollingStatusPanel';
import MetricBars from '@/components/client/MetricBars';

export default function SystemPage() {
  return (
    <main className="container">
      <h1 className="title">システム状態</h1>
      <div className="two">
        <PollingStatusPanel />
        <MetricBars />
      </div>
    </main>
  );
}
