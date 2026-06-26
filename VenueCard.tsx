import RaceCard from "@/components/RaceCard";
import { getVenue, racesByVenue } from "@/lib/mockData";
import Link from "next/link";
import { notFound } from "next/navigation";

export default function RacePage({ params }: { params: { venue: string } }) {
  const venue = getVenue(params.venue);
  if (!venue) notFound();
  const races = racesByVenue(params.venue);

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/venue" className="text-blue-600 font-bold">← 開催場へ戻る</Link>
        <h1 className="text-3xl font-black mt-3">{venue.name} レース選択</h1>
        <p className="text-slate-500">天候 {venue.weather} / 風 {venue.wind}</p>
      </div>
      <div className="grid gap-3">
        {races.map((race) => <RaceCard key={race.id} race={race} />)}
      </div>
    </main>
  );
}
