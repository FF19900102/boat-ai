"use client";
export function RaceSelector({ selected, onSelect }: { selected: number; onSelect: (raceNo: number) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2 md:grid-cols-12">
      {Array.from({ length: 12 }, (_, i) => i + 1).map((no) => (
        <button key={no} onClick={() => onSelect(no)} className={`rounded-xl border px-3 py-3 text-sm font-black ${selected === no ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white"}`}>
          {no}R
        </button>
      ))}
    </div>
  );
}
