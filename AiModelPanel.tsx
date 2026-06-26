import { TrifectaPick } from "@/lib/types";

export function ExpectedValueTable({ picks }: { picks: TrifectaPick[] }) {
  const shown = picks.filter(p => p.odds > 0).slice(0, 20);
  const best = shown[0];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-black">期待値ランキング</h3>
          <p className="text-xs text-slate-500">期待値 = 的中確率 × オッズ × 100</p>
        </div>
        <div className={`rounded-xl px-4 py-2 text-sm font-black ${best && best.ev >= 120 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
          {best && best.ev >= 120 ? "買い候補あり" : "見送り寄り"}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead><tr><th className="th">買い目</th><th className="th">確率</th><th className="th">オッズ</th><th className="th">期待値</th><th className="th">判定</th></tr></thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.key}>
                <td className="td font-black">{p.key}</td>
                <td className="td">{(p.probability * 100).toFixed(2)}%</td>
                <td className="td">{p.odds.toFixed(1)}</td>
                <td className="td font-black">{p.ev.toFixed(0)}</td>
                <td className="td"><span className={`rounded-full px-2 py-1 text-xs font-bold ${p.decision === "買い候補" ? "bg-emerald-100 text-emerald-700" : p.decision === "注意" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{p.decision}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && <div className="py-8 text-center text-sm text-slate-500">オッズを入力してください</div>}
      </div>
    </div>
  );
}
