import {BacktestSummary} from '@/types/boat';
import {yen} from '@/lib/format';
export default function BacktestSummaryPanel({summary}:{summary:BacktestSummary}){
  return <div className="grid split3">
    <div className="card"><div className="muted">検証レース</div><div className="kpi">{summary.raceCount}</div><div className="mini">購入対象 {summary.betRaceCount}R</div></div>
    <div className="card"><div className="muted">的中率</div><div className="kpi">{summary.hitRate}%</div><div className="mini">的中 {summary.hitCount}R</div></div>
    <div className={summary.returnRate>=100?'card success-card':'card danger-card'}><div className="muted">回収率</div><div className="kpi">{summary.returnRate}%</div><div className="mini">収支 {yen(summary.profit)}</div></div>
    <div className="card"><div className="muted">投資</div><div className="score">{yen(summary.investment)}</div></div>
    <div className="card"><div className="muted">払戻</div><div className="score">{yen(summary.payout)}</div></div>
    <div className="card"><div className="muted">平均EV</div><div className="score">{summary.averageEv}</div></div>
  </div>
}
