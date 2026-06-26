"use client";
import { BoatEntry } from "@/lib/types";

const fields: { key: keyof BoatEntry; label: string; type?: string }[] = [
  { key: "racerName", label: "選手" },
  { key: "className", label: "級" },
  { key: "nationalWinRate", label: "全国" },
  { key: "localWinRate", label: "当地" },
  { key: "avgST", label: "ST" },
  { key: "motor2Rate", label: "モーター" },
  { key: "boat2Rate", label: "ボート" },
  { key: "exhibitionTime", label: "展示" },
  { key: "tilt", label: "チルト" },
  { key: "weight", label: "体重" },
  { key: "course", label: "進入" },
];

export function EntryTable({ entries, onChange }: { entries: BoatEntry[]; onChange: (entries: BoatEntry[]) => void }) {
  const update = (lane: number, key: keyof BoatEntry, value: string) => {
    const next = entries.map((e) => {
      if (e.lane !== lane) return e;
      const isText = key === "racerName" || key === "className";
      return { ...e, [key]: isText ? value : Number(value) };
    });
    onChange(next);
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="min-w-[1050px] w-full">
        <thead><tr><th className="th">艇</th>{fields.map(f => <th key={String(f.key)} className="th">{f.label}</th>)}</tr></thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.lane}>
              <td className="td"><span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 font-black text-white">{e.lane}</span></td>
              {fields.map((f) => (
                <td key={String(f.key)} className="td">
                  <input className="input min-w-20" value={String(e[f.key])} onChange={(ev) => update(e.lane, f.key, ev.target.value)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
