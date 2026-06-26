import Link from "next/link";
import { Race } from "@/lib/types";

export function RaceCard({ race }: { race: Race }) {
  return (
    <Link href={`/race/${race.venueId}/${race.raceNo}`} className="card block p-4 hover:border-blue-400">
      <div className="flex items-center justify-between">
        <div className="text-2xl font-black">{race.raceNo}R</div>
        <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold">締切 {race.deadline}</div>
      </div>
      <div className="mt-2 text-sm text-gray-600">{race.title}</div>
      <div className="mt-3 text-xs text-gray-500">風 {race.wind}m / 波 {race.wave}cm</div>
    </Link>
  );
}
