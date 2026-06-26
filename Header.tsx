'use client';
import { useState } from 'react';
import { Header } from '@/components/Header';
import { VenueSelector } from '@/components/VenueSelector';
import { RaceSelector } from '@/components/RaceSelector';
import { RacerTable } from '@/components/RacerTable';
import { WeatherPanel } from '@/components/WeatherPanel';
import { PredictionPanel } from '@/components/PredictionPanel';
import { ResultPanel } from '@/components/ResultPanel';
import { Dashboard } from '@/components/Dashboard';
import { defaultRacers, defaultWeather, venues } from '@/lib/sampleData';
import type { Racer, RaceWeather } from '@/lib/types';

export default function HomePage() {
  const [venueId, setVenueId] = useState('hamanako');
  const [raceNo, setRaceNo] = useState(1);
  const [racers, setRacers] = useState<Racer[]>(defaultRacers);
  const [weather, setWeather] = useState<RaceWeather>(defaultWeather);
  const selectedVenue = venues.find((v) => v.id === venueId) || venues[0];

  return (
    <>
      <Header />
      <main className="container grid">
        <VenueSelector venues={venues} selected={venueId} onSelect={setVenueId} />
        <RaceSelector raceNo={raceNo} onSelect={setRaceNo} />
        <section className="card">
          <h2>{selectedVenue.name} {raceNo}R</h2>
          <div className="small">今は手入力版。後で公式データ取得APIに差し替える前提の構造です。</div>
        </section>
        <RacerTable racers={racers} onChange={setRacers} />
        <WeatherPanel weather={weather} onChange={setWeather} />
        <PredictionPanel racers={racers} weather={weather} />
        <ResultPanel venue={selectedVenue.name} raceNo={raceNo} racers={racers} weather={weather} />
        <Dashboard />
      </main>
    </>
  );
}
