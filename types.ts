import { Header } from "@/components/Header";
import { VenueCard } from "@/components/VenueCard";
import { getTodayVenues } from "@/lib/mockData";

export default function Home() {
  const todayVenues = getTodayVenues();
  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="mb-6">
          <h1 className="text-3xl font-black">本日開催</h1>
          <p className="mt-2 text-gray-600">開催場を選んでレースへ進みます。</p>
        </section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {todayVenues.map((venue) => <VenueCard key={venue.id} venue={venue} />)}
        </div>
      </main>
    </>
  );
}
