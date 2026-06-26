"use client";
import { TrifectaPick } from "@/lib/types";

export function OddsEditor({ picks, odds, onChange }: { picks: TrifectaPick[]; odds: Record<string, number>; onChange: (odds: Record<string, number>) => void }) {
  const top = picks.slice(0, 20);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-black">オッズ入力</h3>
          <p className="text-xs text-slate-500">上位20点だけ表示。未入力は期待値0。</p>
        </div>
        <button className="btn btn-ghost text-xs" onClick={() => {
          const next = { ...odds };
          top.forEach((p, i) => { if (!next[p.key]) next[p.key] = Number((8 + i * 1.7).toFixed(1)); });
          onChange(next);
        }}>仮オッズ入力</button>
      </div>
      <div className="grid gap-2 md:grid-cols-4">
        {top.map((p) => (
          <label key={p.key} className="flex items-center gap-2 rounded-xl border border-slate-100 p-2">
            <span className="w-16 font-black">{p.key}</span>
            <input className="input" type="number" step="0.1" value={odds[p.key] ?? ""} onChange={(e)=>onChange({ ...odds, [p.key]: Number(e.target.value) })} />
          </label>
        ))}
      </div>
    </div>
  );
}
