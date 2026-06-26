import Header from '@/components/Header';
import VenueCard from '@/components/VenueCard';
import { venues } from '@/lib/data';

export default function Home() {
  const today = new Date().toLocaleDateString('ja-JP');
  return (
    <>
      <Header />
      <main className="wrap">
        <div className="topline">
          <div>
            <h1 className="title">本日開催</h1>
            <p className="muted">{today} / 開催場を選択してください</p>
          </div>
        </div>
        <section className="section grid">
          {venues.map((venue) => <VenueCard key={venue.id} venue={venue} />)}
        </section>
      </main>
    </>
  );
}
