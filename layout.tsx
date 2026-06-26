import { ApiStatusCard } from '@/components/ApiStatusCard';
import { OddsWorkbench } from '@/components/OddsWorkbench';
import { PredictionTable } from '@/components/PredictionTable';
import { ResultRecorder } from '@/components/ResultRecorder';
import { StrategyPanel } from '@/components/StrategyPanel';
import { WeatherPanel } from '@/components/WeatherPanel';
import { makeTrifectaPredictions, predictRace } from '@/lib/aiEngine';
import { getRace } from '@/lib/mockData';
import { evaluateStrategies, makeRaceCommentary } from '@/lib/strategyEngine';

export default function RaceDetailPage({ params }: { params: { venue: string; raceNo: string } }) {
  const race = getRace(params.venue, Number(params.raceNo));
  const predictions = predictRace(race);
  const trifecta = makeTrifectaPredictions(race);
  const strategies = evaluateStrategies(race);
  const comments = makeRaceCommentary(race, strategies[0]);
  const buyCount = trifecta.filter(i => i.expectedValue >= 120).length;
  const top = trifecta[0];

  return (
    <>
      <div className="section-title">
        <h2>{race.venueName} {race.raceNo}R AI予想</h2>
        <span className="badge">締切 {race.deadline}</span>
      </div>
      <WeatherPanel race={race} />
      <div style={{ height: 14 }} />
      <StrategyPanel strategies={strategies} comments={comments} />
      <div className="section-title"><h2>AI確率ランキング</h2><span className="badge">1着・2連対・3連対</span></div>
      <PredictionTable predictions={predictions} />
      <div className="section-title"><h2>3連単 期待値ランキング</h2><span className="badge">120通り計算 / 買い候補 {buyCount}点</span></div>
      {top && <div className="alert">最上位：{top.combination} / 期待値 {top.expectedValue.toFixed(1)} / {top.expectedValue >= 120 ? '購入候補' : '見送り寄り'}</div>}
      <div style={{height: 14}} />
      <OddsWorkbench race={race} initialItems={trifecta} />
      <div style={{height: 18}} />
      <ResultRecorder race={race} topItems={trifecta} />
      <div style={{height: 18}} />
      <ApiStatusCard />
    </>
  );
}
