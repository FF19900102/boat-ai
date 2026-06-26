import Link from "next/link";
import VenueCard from "@/components/VenueCard";
import { venues } from "@/lib/mockData";

export default function Home() {
  const openVenues = venues.filter((venue) => venue.isOpenToday);
  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <section className="card p-8 mb-8">
        <p className="text-blue-600 font-bold mb-2">Phase 1</p>
        <h1 className="text-4xl font-black mb-3">Boat AI</h1>
        <p className="text-slate-600 mb-6">今日の開催場からレースを選び、AI予想へ進む土台です。</p>
        <Link href="/venue" className="btn btn-primary">本日開催を見る</Link>
      </section>

      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-2xl font-black">本日開催</h2>
            <p className="text-slate-500 text-sm">現在は仮データ。次工程で自動取得に接続します。</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {openVenues.map((venue) => <VenueCard key={venue.id} venue={venue} />)}
        </div>
      </section>
    </main>
  );
}
