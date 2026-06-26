'use client';

import { useMemo, useState } from 'react';
import type { TrifectaPrediction } from '@/lib/types';
import { formatPercent } from '@/lib/aiEngine';
import { formatYen, makeBetPlan } from '@/lib/portfolio';

export function BetPlanPanel({ items }: { items: TrifectaPrediction[] }) {
  const [budget, setBudget] = useState(1000);
  const [tickets, setTickets] = useState(6);
  const plan = useMemo(() => makeBetPlan(items, budget, tickets), [items, budget, tickets]);

  return (
    <div className="card">
      <div className="section-title" style={{ marginTop: 0 }}>
        <h2>資金配分プラン</h2>
        <span className="badge">{plan.judge}</span>
      </div>
      <p className="sub">期待値上位の買い目に予算を自動配分します。実投票前の資金管理用です。</p>
      <div style={{ height: 12 }} />
      <div className="form-row">
        <div className="field">
          <label>予算</label>
          <input value={budget} inputMode="numeric" onChange={e => setBudget(Number(e.target.value) || 0)} />
        </div>
        <div className="field">
          <label>最大点数</label>
          <select value={tickets} onChange={e => setTickets(Number(e.target.value))}>
            {[3, 4, 5, 6, 8, 10].map(n => <option key={n} value={n}>{n}点</option>)}
          </select>
        </div>
        <div className="field">
          <label>判定理由</label>
          <div className="alert" style={{ padding: 10 }}>{plan.reason}</div>
        </div>
      </div>
      <div style={{ height: 12 }} />
      <div className="grid grid-4">
        <div className="kpi"><span>投資予定</span><strong>{formatYen(plan.totalStake)}</strong></div>
        <div className="kpi"><span>期待払戻</span><strong>{formatYen(plan.expectedReturn)}</strong></div>
        <div className="kpi"><span>期待収支</span><strong className={plan.expectedProfit >= 0 ? 'good' : 'bad'}>{formatYen(plan.expectedProfit)}</strong></div>
        <div className="kpi"><span>的中カバー</span><strong>{formatPercent(plan.hitCoverage)}</strong></div>
      </div>
      <div style={{ height: 12 }} />
      <div className="table-wrap">
        <table>
          <thead><tr><th>買い目</th><th>投資</th><th>確率</th><th>オッズ</th><th>期待値</th><th>的中時払戻</th></tr></thead>
          <tbody>
            {plan.items.map(item => (
              <tr key={item.combination}>
                <td><b>{item.combination}</b></td>
                <td>{formatYen(item.stake)}</td>
                <td>{formatPercent(item.probability)}</td>
                <td>{item.odds.toFixed(1)}</td>
                <td className={item.expectedValue >= 120 ? 'good' : item.expectedValue >= 100 ? 'warn' : 'bad'}>{item.expectedValue.toFixed(1)}</td>
                <td>{formatYen(item.stake * item.odds)}</td>
              </tr>
            ))}
            {!plan.items.length && <tr><td colSpan={6}>買い候補がありません。</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
