import VenueCard from "@/components/VenueCard";
import { venues } from "@/lib/mockData";

export default function VenuePage() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-black mb-2">開催場一覧</h1>
      <p className="text-slate-500 mb-6">本日開催している場を選択してください。</p>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {venues.map((venue) => <VenueCard key={venue.id} venue={venue} />)}
      </div>
    </main>
  );
}
