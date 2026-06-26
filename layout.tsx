import { PredictionTable } from '@/components/PredictionTable';
import { ResultRecorder } from '@/components/ResultRecorder';
import { TrifectaTable } from '@/components/TrifectaTable';
import { makeTrifectaPredictions, predictRace } from '@/lib/aiEngine';
import { getRace } from '@/lib/mockData';

export default function RaceDetailPage({ params }: { params: { venue: string; raceNo: string } }) {
  const race = getRace(params.venue, Number(params.raceNo));
  const predictions = predictRace(race);
  const trifecta = makeTrifectaPredictions(race);
  const buyCount = trifecta.filter(i => i.expectedValue >= 120).length;
  const top = trifecta[0];

  return (
    <>
      <div className="section-title">
        <h2>{race.venueName} {race.raceNo}R AI予想</h2>
        <span className="badge">締切 {race.deadline}</span>
      </div>
      <section className="grid grid-4">
        <div className="card kpi"><span>天候</span><strong>{race.weather.weather}</strong></div>
        <div className="card kpi"><span>風</span><strong>{race.weather.windDirection} {race.weather.windSpeed}m</strong></div>
        <div className="card kpi"><span>波</span><strong>{race.weather.waveHeight}cm</strong></div>
        <div className="card kpi"><span>買い候補</span><strong>{buyCount}点</strong></div>
      </section>
      <div className="section-title"><h2>AI確率ランキング</h2><span className="badge">1着・2連対・3連対</span></div>
      <PredictionTable predictions={predictions} />
      <div className="section-title"><h2>3連単 期待値ランキング</h2><span className="badge">120通り計算</span></div>
      {top && <div className="alert">最上位：{top.combination} / 期待値 {top.expectedValue.toFixed(1)} / {top.expectedValue >= 120 ? '購入候補' : '見送り寄り'}</div>}
      <div style={{height: 14}} />
      <TrifectaTable items={trifecta} />
      <div style={{height: 18}} />
      <ResultRecorder race={race} topItems={trifecta} />
    </>
  );
}
