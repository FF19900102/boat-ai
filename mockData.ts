"use client";
import { SavedRace } from "@/lib/types";

export function Dashboard({ races }: { races: SavedRace[] }) {
  const results = races.map(r => r.result).filter(Boolean);
  const stake = results.reduce((s, r) => s + (r?.stake ?? 0), 0);
  const returns = results.reduce((s, r) => s + (r?.returnAmount ?? 0), 0);
  const hits = results.filter(r => r?.hit).length;
  const roi = stake > 0 ? (returns / stake) * 100 : 0;
  const profit = returns - stake;

  const byVenue = races.reduce<Record<string, { stake: number; returns: number; count: number }>>((acc, r) => {
    if (!r.result) return acc;
    const row = acc[r.venueName] ?? { stake: 0, returns: 0, count: 0 };
    row.stake += r.result.stake;
    row.returns += r.result.returnAmount;
    row.count += 1;
    acc[r.venueName] = row;
    return acc;
  }, {});

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Stat title="保存レース" value={`${races.length}`} />
      <Stat title="的中率" value={results.length ? `${((hits / results.length) * 100).toFixed(1)}%` : "-"} />
      <Stat title="回収率" value={stake ? `${roi.toFixed(1)}%` : "-"} />
      <Stat title="総投資" value={`${stake.toLocaleString()}円`} />
      <Stat title="総回収" value={`${returns.toLocaleString()}円`} />
      <Stat title="収支" value={`${profit.toLocaleString()}円`} />
      <div className="card p-4 lg:col-span-3">
        <h3 className="mb-3 font-black">競艇場別成績</h3>
        <div className="grid gap-2 md:grid-cols-3">
          {Object.entries(byVenue).map(([venue, v]) => (
            <div key={venue} className="rounded-xl border border-slate-100 p-3">
              <div className="font-bold">{venue}</div>
              <div className="text-sm text-slate-500">{v.count}件 / 回収率 {v.stake ? ((v.returns / v.stake) * 100).toFixed(1) : 0}%</div>
            </div>
          ))}
          {Object.keys(byVenue).length === 0 && <p className="text-sm text-slate-500">結果保存後に表示されます</p>}
        </div>
      </div>
    </div>
  );
}
function Stat({ title, value }: { title: string; value: string }) {
  return <div className="card p-4"><div className="text-xs font-bold text-slate-500">{title}</div><div className="mt-1 text-2xl font-black">{value}</div></div>;
}
