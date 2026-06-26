"use client";
import { Venue } from "@/lib/types";

export function VenueSelector({ venues, selected, onSelect }: { venues: Venue[]; selected: string; onSelect: (id: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
      {venues.filter(v => v.today).map((v) => (
        <button key={v.id} onClick={() => onSelect(v.id)} className={`rounded-2xl border p-4 text-left transition ${selected === v.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white hover:border-slate-400"}`}>
          <div className="text-lg font-black">{v.name}</div>
          <div className={`text-xs ${selected === v.id ? "text-slate-200" : "text-slate-500"}`}>{v.region} / {v.water}</div>
        </button>
      ))}
    </div>
  );
}
