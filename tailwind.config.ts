import type { Race } from "@/lib/types";

export default function RaceCard({ race }: { race: Race }) {
  return (
    <div className="card p-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-2xl font-black">{race.raceNo}R</p>
        <p className="text-sm text-slate-500">{race.title}</p>
      </div>
      <div className="text-right">
        <p className="text-xs text-slate-500">締切予定</p>
        <p className="text-lg font-black">{race.deadline}</p>
      </div>
      <button className="btn btn-primary">予想画面へ</button>
    </div>
  );
}
