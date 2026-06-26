import { Header } from "@/components/Header";
import { OddsTable } from "@/components/OddsTable";
import { PredictionTable } from "@/components/PredictionTable";
import { makeTrifecta, predictRace } from "@/lib/boatAi";
import { getRace, getVenue } from "@/lib/mockData";

export default function RaceDetailPage({ params }: { params: { venue: string; raceNo: string } }) {
  const raceNo = Number(params.raceNo);
  const venue = getVenue(params.venue);
  const race = getRace(params.venue, raceNo);
  const predictions = predictRace(race);
  const picks = makeTrifecta(predictions);
  const best = picks[0];
  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-black">{venue?.name} {raceNo}R</h1>
            <p className="mt-2 text-gray-600">締切 {race.deadline} / 風 {race.wind}m / 波 {race.wave}cm</p>
          </div>
          <div className={`rounded-2xl px-5 py-3 font-black ${best.ev >= 120 ? "bg-blue-700 text-white" : "bg-gray-200"}`}>
            {best.ev >= 120 ? "買い候補あり" : "見送り推奨"} EV {best.ev.toFixed(0)}
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <PredictionTable predictions={predictions} />
          <OddsTable picks={picks} />
        </div>
      </main>
    </>
  );
}
