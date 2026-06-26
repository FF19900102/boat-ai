import {makeRace,venues} from '@/lib/mockData';
import {predictRace,makeTrifectaPicks,aiConfidence,explainRace} from '@/ai/predict';
import EntryTable from '@/components/EntryTable';
import PredictionTable from '@/components/PredictionTable';
import ExpectedValueTable from '@/components/ExpectedValueTable';
import ResultForm from '@/components/ResultForm';
import WeatherPanel from '@/components/WeatherPanel';
import AiReasonList from '@/components/AiReasonList';
import LiveStatusPanel from '@/components/LiveStatusPanel';
import OddsEditor from '@/components/OddsEditor';
import DataSourceBadge from '@/components/DataSourceBadge';
import {getRaceDetail} from '@/services/liveBoatRace';

export default async function RacePage({params}:{params:{venueId:string;raceNo:string}}){
  const detail=await getRaceDetail(params.venueId,Number(params.raceNo));
  const race=detail.race||makeRace(params.venueId,Number(params.raceNo));
  const venue=venues.find(v=>v.id===params.venueId);
  const predictions=predictRace(race);
  const picks=makeTrifectaPicks(race,Number(params.raceNo));
  const conf=aiConfidence(picks);
  const reasons=explainRace(race);
  return <>
    <div className="card"><div className="row"><div><h1>{venue?.name} {race.raceNo}R</h1><p className="muted">締切 {race.deadline} / {race.weather} / 風 {race.wind}m / 波 {race.wave}cm</p></div><div><div className="score">{conf.stars}</div><span className="pill">{conf.label}</span></div></div><p>{conf.message}</p></div>
    <div className="grid two" style={{marginTop:16}}><DataSourceBadge sources={detail.sources}/><LiveStatusPanel/></div>
    <h2 className="section-title">出走表</h2><EntryTable race={race}/>
    <div className="grid two"><WeatherPanel race={race}/><AiReasonList reasons={reasons}/></div>
    <div className="grid two"><div><h2 className="section-title">AI確率</h2><PredictionTable predictions={predictions}/></div><div><h2 className="section-title">期待値ランキング</h2><ExpectedValueTable picks={picks}/></div></div>
    <h2 className="section-title">オッズ調整</h2><OddsEditor picks={picks}/>
    <h2 className="section-title">結果反映</h2><ResultForm raceId={race.id} bestCombo={picks[0]?.combo||''}/>
  </>}
