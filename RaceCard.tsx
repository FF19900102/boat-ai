import { Header } from "@/components/Header";
import { RaceCard } from "@/components/RaceCard";
import { getRacesByVenue, getVenue } from "@/lib/mockData";

export default function VenueRacePage({ params }: { params: { venue: string } }) {
  const venue = getVenue(params.venue);
  const races = getRacesByVenue(params.venue);
  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-black">{venue?.name ?? params.venue}</h1>
        <p className="mt-2 text-gray-600">レースを選択してください。</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {races.map((race) => <RaceCard key={race.raceNo} race={race} />)}
        </div>
      </main>
    </>
  );
}
