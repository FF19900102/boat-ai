'use client';
import Header from '@/components/Header';
import EntryEditor from '@/components/EntryEditor';
import ProbabilityTable from '@/components/ProbabilityTable';
import TrifectaTable from '@/components/TrifectaTable';
import ResultPanel from '@/components/ResultPanel';
import { venues, defaultEntries, defaultWeather, todayText } from '@/lib/mockData';
import { calculateProbabilities, generateTrifectas, judgeRace } from '@/lib/ai';
import { useMemo, useState } from 'react';
export default function RacePage({params}:{params:{venue:string;raceNo:string}}){
 const venue=venues.find(v=>v.id===params.venue); const [entries,setEntries]=useState(defaultEntries); const [weather,setWeather]=useState(defaultWeather); const [selected,setSelected]=useState<string[]>([]);
 const race={venueId:params.venue,venueName:venue?.name??params.venue,raceNo:Number(params.raceNo),date:todayText(),entries,weather};
 const probs=useMemo(()=>calculateProbabilities(race),[JSON.stringify(race)]); const trifectas=useMemo(()=>generateTrifectas(race,probs),[JSON.stringify(probs)]); const j=judgeRace(trifectas);
 return <main className="wrap"><Header/><div className="card"><div className="row" style={{justifyContent:'space-between'}}><div><h1 className="sectionTitle">{race.venueName} {race.raceNo}R</h1><div className="muted">出走表を入れるとAI確率・期待値を自動計算</div></div><div className={j.className} style={{fontSize:22,fontWeight:900}}>{j.label}<div className="small muted">{j.message}</div></div></div></div><div className="card" style={{marginTop:14}}><h2 className="sectionTitle">気象</h2><div className="grid grid4"><label>天候<input value={weather.weather} onChange={e=>setWeather({...weather,weather:e.target.value})}/></label><label>風向<input value={weather.windDir} onChange={e=>setWeather({...weather,windDir:e.target.value})}/></label><label>風速<input type="number" value={weather.windSpeed} onChange={e=>setWeather({...weather,windSpeed:Number(e.target.value)})}/></label><label>波高<input type="number" value={weather.wave} onChange={e=>setWeather({...weather,wave:Number(e.target.value)})}/></label></div></div><div style={{marginTop:14}}><EntryEditor entries={entries} setEntries={setEntries}/></div><div className="grid grid2" style={{marginTop:14}}><ProbabilityTable probs={probs}/><div className="card"><h2 className="sectionTitle">推奨</h2><div className="kpi">{trifectas[0]?.key}</div><div className="muted">期待値 {trifectas[0]?.ev.toFixed(0)} / 的中確率 {(trifectas[0]?.probability*100).toFixed(2)}%</div><div className="notice" style={{marginTop:12}}>EV120以上を買い候補。候補が弱い場合は見送り。</div></div></div><div style={{marginTop:14}}><TrifectaTable items={trifectas} selected={selected} setSelected={setSelected}/></div><div style={{marginTop:14}}><ResultPanel race={race} trifectas={trifectas} selected={selected}/></div></main>
}
