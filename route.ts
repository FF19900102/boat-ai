'use client';
import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { VenueSelector } from '@/components/VenueSelector';
import { RaceSelector } from '@/components/RaceSelector';
import { RacerTable } from '@/components/RacerTable';
import { WeatherPanel } from '@/components/WeatherPanel';
import { PredictionPanel } from '@/components/PredictionPanel';
import { ResultPanel } from '@/components/ResultPanel';
import { Dashboard } from '@/components/Dashboard';
import { AutoSyncPanel } from '@/components/AutoSyncPanel';
import { defaultRacers, defaultWeather, venues as fallbackVenues } from '@/lib/sampleData';
import type { Racer, RaceWeather, Venue } from '@/lib/types';
import { fetchRaceData, fetchRaceResult, fetchRaces, fetchVenues, type RaceMeta, type ResultPayload } from '@/services/boatDataClient';

export default function HomePage() {
  const [venues, setVenues] = useState<Venue[]>(fallbackVenues);
  const [venueId, setVenueId] = useState('hamanako');
  const [raceNo, setRaceNo] = useState(1);
  const [races, setRaces] = useState<RaceMeta[]>([]);
  const [racers, setRacers] = useState<Racer[]>(defaultRacers);
  const [weather, setWeather] = useState<RaceWeather>(defaultWeather);
  const [source, setSource] = useState('local sample');
  const [updatedAt, setUpdatedAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchedResult, setFetchedResult] = useState<ResultPayload | null>(null);
  const selectedVenue = venues.find((v) => v.id === venueId) || venues[0];

  useEffect(() => {
    fetchVenues()
      .then((data) => {
        setVenues(data.venues);
        setSource(data.source);
        setUpdatedAt(data.updatedAt);
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    fetchRaces(venueId)
      .then((data) => {
        setRaces(data.races);
        setSource(data.source);
        setUpdatedAt(data.updatedAt);
      })
      .catch(() => setRaces([]));
  }, [venueId]);

  useEffect(() => {
    loadRaceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId, raceNo]);

  async function loadRaceData() {
    try {
      setLoading(true);
      setFetchedResult(null);
      const data = await fetchRaceData(venueId, raceNo);
      setRacers(data.racers);
      setWeather(data.weather);
      setSource(data.source);
      setUpdatedAt(data.updatedAt);
    } finally {
      setLoading(false);
    }
  }

  async function loadResult() {
    try {
      setLoading(true);
      const data = await fetchRaceResult(venueId, raceNo);
      setFetchedResult(data);
      setSource(data.source);
      setUpdatedAt(data.updatedAt);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header />
      <main className="container grid">
        <VenueSelector venues={venues} selected={venueId} onSelect={setVenueId} />
        <RaceSelector races={races} raceNo={raceNo} onSelect={setRaceNo} />
        <AutoSyncPanel source={source} updatedAt={updatedAt} loading={loading} onReload={loadRaceData} onFetchResult={loadResult} />
        <section className="card">
          <h2>{selectedVenue.name} {raceNo}R</h2>
          <div className="small">出走表・展示・結果速報をAPI経由で取得する形に変更済み。現在はモックAPIです。</div>
        </section>
        <RacerTable racers={racers} onChange={setRacers} />
        <WeatherPanel weather={weather} onChange={setWeather} />
        <PredictionPanel racers={racers} weather={weather} />
        <ResultPanel venue={selectedVenue.name} raceNo={raceNo} racers={racers} weather={weather} fetchedResult={fetchedResult} />
        <Dashboard />
      </main>
    </>
  );
}
