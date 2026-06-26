import { getRaceById } from '@/services/boatrace/client';
import { calculateProbabilities, generateTrifecta } from '@/ai/predict';
import { EntryTable } from '@/components/race/EntryTable';
import { ExpectedValueTable } from '@/components/race/ExpectedValueTable';
import { ProbabilityTable } from '@/components/race/ProbabilityTable';
import { ResultRecorder } from '@/components/race/ResultRecorder';
import { WeatherCard } from '@/components/race/WeatherCard';

export default async function RacePage({ params }: { params: { raceId: string } }) {
  const race = await getRaceById(params.raceId);
  const probabilities = calculateProbabilities(race.entries, race.weather);
  const trifecta = generateTrifecta(probabilities);
  const top = trifecta[0];

  return (
    <main className="container">
      <section className="hero">
        <span className="badge">{race.venueName} {race.raceNo}R</span>
        <h1>{race.title}</h1>
        <p>締切 {race.deadline} / 距離 {race.distance}m</p>
        <div className="grid grid-3">
          <div><div className="muted">AI本命</div><div className="kpi green">{probabilities[0].lane}号艇</div></div>
          <div><div className="muted">最上位買い目</div><div className="kpi green">{top.combination}</div></div>
          <div><div className="muted">期待値</div><div className="kpi yellow">{top.expectedValue}</div></div>
        </div>
      </section>
      <div className="section-title"><h2>レース分析</h2><span className="muted">AI計算 初期版</span></div>
      <div className="grid grid-2">
        <WeatherCard weather={race.weather} />
        <ProbabilityTable rows={probabilities} />
      </div>
      <div style={{ height: 16 }} />
      <EntryTable entries={race.entries} />
      <div style={{ height: 16 }} />
      <ExpectedValueTable rows={trifecta} />
      <div style={{ height: 16 }} />
      <ResultRecorder raceId={race.id} topCombination={top.combination} />
    </main>
  );
}
