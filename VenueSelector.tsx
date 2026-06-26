'use client';
import { useMemo, useState } from 'react';
import { VenueSelector } from '@/components/VenueSelector';
import { RaceSelector } from '@/components/RaceSelector';
import { BoatTable } from '@/components/BoatTable';
import { WeatherPanel } from '@/components/WeatherPanel';
import { ProbabilityTable } from '@/components/ProbabilityTable';
import { BetTable } from '@/components/BetTable';
import { ResultPanel } from '@/components/ResultPanel';
import { defaultBoats, defaultWeather, venues } from '@/lib/data';
import { probabilities, trifectaBets } from '@/lib/ai';
import { Boat, Weather } from '@/lib/types';

export default function Home() {
  const [venueId, setVenueId] = useState('hamanako');
  const [raceNo, setRaceNo] = useState(1);
  const [boats, setBoats] = useState<Boat[]>(defaultBoats(1));
  const [weather, setWeather] = useState<Weather>(defaultWeather);
  const [oddsMap, setOddsMap] = useState<Record<string, number>>({});

  const venue = venues.find((v) => v.id === venueId) ?? venues[0];
  const probs = useMemo(() => probabilities(boats, weather), [boats, weather]);
  const bets = useMemo(() => trifectaBets(probs, oddsMap), [probs, oddsMap]);
  const buyBets = bets.filter((b) => b.ev >= 120);
  const topCombo = bets[0]?.combo ?? '';

  function selectVenue(id: string) {
    setVenueId(id);
    setRaceNo(1);
    setBoats(defaultBoats(id.length));
    setOddsMap({});
  }
  function selectRace(no: number) {
    setRaceNo(no);
    setBoats(defaultBoats(no));
    setOddsMap({});
  }

  return (
    <main className="container">
      <header className="header">
        <div>
          <div className="logo">Boat AI</div>
          <div className="muted">確率・期待値・結果検証で戦う競艇AI</div>
        </div>
        <div className="card"><strong>{new Date().toLocaleDateString('ja-JP')}</strong><div className="muted">本日開催デモ</div></div>
      </header>

      <div className="section-title">1. 本日開催場</div>
      <VenueSelector selected={venueId} onSelect={selectVenue} />

      <div className="section-title">2. レース選択：{venue.name}</div>
      <RaceSelector selected={raceNo} onSelect={selectRace} />

      <div className="section-title">3. 出走表・気象</div>
      <div className="two">
        <WeatherPanel weather={weather} onChange={setWeather} />
        <div className="card">
          <div className="section-title" style={{ marginTop: 0 }}>AI判定</div>
          <p>対象：<strong>{venue.name} {raceNo}R</strong></p>
          <p>推奨：<strong>{buyBets.length ? `${buyBets.length}点 買い候補あり` : '見送り'}</strong></p>
          <p className="muted">今はデモデータ。次工程で公式データ取得部分を接続します。</p>
        </div>
      </div>
      <div style={{ height: 14 }} />
      <BoatTable boats={boats} onChange={setBoats} />

      <div className="section-title">4. AI確率</div>
      <ProbabilityTable rows={probs} />

      <div className="section-title">5. 3連単 期待値ランキング</div>
      <BetTable bets={bets} oddsMap={oddsMap} onOddsChange={(combo, odds) => setOddsMap((m) => ({ ...m, [combo]: odds }))} />

      <div className="section-title">6. 結果反映・成績保存</div>
      <ResultPanel venue={venue} raceNo={raceNo} topCombo={topCombo} />
    </main>
  );
}
