import RaceCard from '@/components/RaceCard';
import VenueCard from '@/components/VenueCard';
import { raceService } from '@/services/raceService';

export default function VenuesPage({ searchParams }: { searchParams: { venue?: string } }) {
  const venues = raceService.listVenues();
  const selected = searchParams.venue ? raceService.getVenue(searchParams.venue) : undefined;
  const races = selected ? raceService.listRaces(selected.id) : [];

  return (
    <main className="container">
      <h1 className="title">開催場・レース選択</h1>
      {!selected ? (
        <div className="grid">{venues.map(v => <VenueCard key={v.id} venue={v} />)}</div>
      ) : (
        <>
          <div className="card" style={{marginBottom:16}}>
            <h2 style={{marginTop:0}}>{selected.name}</h2>
            <p className="muted">天候 {selected.weather.condition} / 風 {selected.weather.windDirection}{selected.weather.windSpeed}m / 波 {selected.weather.waveHeight}cm</p>
          </div>
          <div className="grid">{races.map(r => <RaceCard key={r.id} race={r} />)}</div>
        </>
      )}
    </main>
  );
}
