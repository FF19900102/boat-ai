import { TrifectaPick } from "@/lib/types";

export function OddsTable({ picks }: { picks: TrifectaPick[] }) {
  const top = picks.slice(0, 12);
  return (
    <div className="card overflow-hidden">
      <div className="p-4 text-lg font-black">期待値ランキング TOP12</div>
      <table className="w-full">
        <thead>
          <tr><th className="th">順位</th><th className="th">買い目</th><th className="th">的中率</th><th className="th">オッズ</th><th className="th">EV</th><th className="th">判定</th></tr>
        </thead>
        <tbody>
          {top.map((p) => (
            <tr key={p.key}>
              <td className="td">{p.rank}</td>
              <td className="td font-black">{p.key}</td>
              <td className="td">{p.probability.toFixed(2)}%</td>
              <td className="td">{p.odds.toFixed(1)}</td>
              <td className="td font-bold">{p.ev.toFixed(0)}</td>
              <td className="td">{p.ev >= 120 ? "買い候補" : p.ev >= 100 ? "注意" : "見送り"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
