"use client";

import { useMemo, useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { VenueSelector } from "@/components/VenueSelector";
import { RaceSelector } from "@/components/RaceSelector";
import { EntryTable } from "@/components/EntryTable";
import { WeatherForm } from "@/components/WeatherForm";
import { ProbabilityTable } from "@/components/ProbabilityTable";
import { OddsEditor } from "@/components/OddsEditor";
import { ExpectedValueTable } from "@/components/ExpectedValueTable";
import { ResultForm } from "@/components/ResultForm";
import { Dashboard } from "@/components/Dashboard";
import { AiModelPanel } from "@/components/AiModelPanel";
import { calculateBoatProbabilities, generateTrifectaPicks } from "@/lib/ai";
import { getTodayText, sampleEntries, venues } from "@/lib/mockData";
import { loadRaces, saveRace, saveResult, clearAllRaces } from "@/lib/storage";
import { RaceInput, SavedRace, Weather } from "@/lib/types";

export default function Home() {
  const [venueId, setVenueId] = useState("hamanako");
  const [raceNo, setRaceNo] = useState(1);
  const [entries, setEntries] = useState(sampleEntries());
  const [weather, setWeather] = useState<Weather>({ weather: "晴", windDirection: "北西", windSpeed: 2, waveHeight: 2 });
  const [odds, setOdds] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState<SavedRace[]>([]);

  useEffect(() => setSaved(loadRaces()), []);

  const venue = venues.find((v) => v.id === venueId) ?? venues[0];
  const race: RaceInput = useMemo(() => ({
    id: `${new Date().toISOString().slice(0,10)}-${venueId}-${raceNo}`,
    date: new Date().toISOString().slice(0,10),
    venueId,
    venueName: venue.name,
    raceNo,
    entries,
    weather,
    odds,
  }), [venueId, venue.name, raceNo, entries, weather, odds]);

  const probabilities = useMemo(() => calculateBoatProbabilities(entries, weather), [entries, weather]);
  const picks = useMemo(() => generateTrifectaPicks(race), [race]);

  const saveCurrent = () => {
    const next = saveRace({ ...race, createdAt: new Date().toISOString() });
    setSaved(next);
  };

  return (
    <main>
      <Header />
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <section className="card p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black">本日開催</h1>
              <p className="text-sm text-slate-500">{getTodayText()} / まずは手動＋仮データ。後で公式データ取得を接続。</p>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-ghost" onClick={() => { setEntries(sampleEntries()); setOdds({}); }}>リセット</button>
              <button className="btn btn-primary" onClick={saveCurrent}>このレースを保存</button>
            </div>
          </div>
          <VenueSelector venues={venues} selected={venueId} onSelect={setVenueId} />
        </section>

        <section className="card p-5">
          <h2 className="mb-3 text-xl font-black">{venue.name} レース選択</h2>
          <RaceSelector selected={raceNo} onSelect={setRaceNo} />
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black">{venue.name} {raceNo}R 予想入力</h2>
            <div className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">Race ID: {race.id}</div>
          </div>
          <EntryTable entries={entries} onChange={setEntries} />
          <div className="card p-4"><WeatherForm weather={weather} onChange={setWeather} /></div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 text-xl font-black">各艇の確率</h2>
            <ProbabilityTable rows={probabilities} />
          </div>
          <div>
            <h2 className="mb-3 text-xl font-black">AI判断</h2>
            <div className="card p-4">
              <div className="text-sm text-slate-500">本命</div>
              <div className="text-4xl font-black">{probabilities[0]?.lane}号艇</div>
              <div className="mt-2 text-sm text-slate-600">1着率 {(probabilities[0]?.firstRate * 100 || 0).toFixed(1)}%</div>
              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">
                {weather.windSpeed >= 5 ? "風が強いためイン信頼度を少し下げています。" : "風が弱く、枠・実力・モーターを総合評価しています。"}
              </div>
            </div>
          </div>
        </section>

        <AiModelPanel race={race} />
        <OddsEditor picks={picks} odds={odds} onChange={setOdds} />
        <ExpectedValueTable picks={picks} />
        <ResultForm race={race} picks={picks} onSave={(result) => setSaved(saveResult(result))} />

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-black">成績ダッシュボード</h2>
            <button className="btn btn-ghost text-xs" onClick={() => { clearAllRaces(); setSaved([]); }}>保存削除</button>
          </div>
          <Dashboard races={saved} />
        </section>
      </div>
    </main>
  );
}
