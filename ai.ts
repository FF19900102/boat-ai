import { aiModels } from "@/lib/ai";
import { RaceInput } from "@/lib/types";

export function AiModelPanel({ race }: { race: RaceInput }) {
  const models = aiModels(race);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-lg font-black">AIモデル比較</h3>
      <div className="grid gap-3 md:grid-cols-5">
        {models.map((m) => (
          <div key={m.name} className="rounded-xl border border-slate-100 p-3">
            <div className="font-black">{m.name}</div>
            <div className="text-xs text-slate-500">{m.focus}</div>
            <div className="mt-2 text-2xl font-black">{m.topLane}号艇</div>
            <div className="text-xs text-slate-500">信頼度 {m.confidence}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}
