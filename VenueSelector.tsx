'use client';
import { useMemo, useState } from 'react';
import Header from '@/components/Header';
import VenueSelector from '@/components/VenueSelector';
import RaceSelector from '@/components/RaceSelector';
import BoatForm from '@/components/BoatForm';
import WeatherForm from '@/components/WeatherForm';
import { PredictionTable, TicketTable } from '@/components/PredictionTables';
import ResultPanel from '@/components/ResultPanel';
import Dashboard from '@/components/Dashboard';
import { makeBoats, venues } from '@/lib/mockData';
import { predict, makeTickets, summary } from '@/lib/ai';
import { Boat, SavedRace, Weather } from '@/lib/types';
import { loadRaces, saveRace, clearRaces } from '@/lib/storage';

export default function Home(){
 const today=new Date().toISOString().slice(0,10); const [venue,setVenue]=useState('hamanako'); const [raceNo,setRaceNo]=useState(1); const [boats,setBoats]=useState<Boat[]>(makeBoats(3)); const [weather,setWeather]=useState<Weather>({weather:'晴',windDir:'北西',windSpeed:2,wave:2}); const [races,setRaces]=useState<SavedRace[]>([]); const [tab,setTab]=useState('race');
 const preds=useMemo(()=>predict(boats,weather),[boats,weather]); const tickets=useMemo(()=>makeTickets(preds),[preds]); const sum=summary(tickets); const venueName=venues.find(v=>v.id===venue)?.name||venue;
 const saveCurrent=(result?:any)=>{const item:SavedRace={id:`${Date.now()}`,date:today,venue:venueName,raceNo,boats,weather,tickets,result,createdAt:new Date().toISOString()};saveRace(item);setRaces(loadRaces());}
 return <main className="wrap"><Header/><div className="tabs"><button className="btn primary" onClick={()=>setTab('race')}>予想</button><button className="btn" onClick={()=>{setRaces(loadRaces());setTab('dash')}}>成績</button><button className="btn danger" onClick={()=>{clearRaces();setRaces([])}}>保存削除</button></div>{tab==='dash'?<><Dashboard races={races}/><div className="card" style={{marginTop:14}}><h3 className="title">保存履歴</h3><table><thead><tr><th>日付</th><th>場</th><th>R</th><th>買い目</th><th>結果</th></tr></thead><tbody>{races.map(r=><tr key={r.id}><td>{r.date}</td><td>{r.venue}</td><td>{r.raceNo}R</td><td>{r.tickets[0]?.key}</td><td>{r.result?`${r.result.order} / ${r.result.bought===r.result.order?'的中':'不的中'}`:'未入力'}</td></tr>)}</tbody></table></div></>:<div className="grid"><div className="card"><h2 className="title">1. 本日開催場</h2><VenueSelector value={venue} onChange={setVenue}/></div><div className="card"><h2 className="title">2. レース選択</h2><RaceSelector value={raceNo} onChange={(n)=>{setRaceNo(n);setBoats(makeBoats(n+venue.length));}}/></div><div className="card"><h2 className="title">3. 気象・水面</h2><WeatherForm weather={weather} onChange={setWeather}/></div><div className="card"><h2 className="title">4. 出走表</h2><BoatForm boats={boats} onChange={setBoats}/></div><div className="grid grid2"><div className="card"><h2 className="title">AI判断</h2><div className="stat green">{sum.grade}</div><p>{venueName} {raceNo}R：{sum.message}</p><button className="btn primary" onClick={()=>saveCurrent()}>予想を保存</button></div><div className="card"><h2 className="title">各艇確率</h2><PredictionTable predictions={preds}/></div></div><div className="card"><h2 className="title">3連単 期待値ランキング</h2><TicketTable tickets={tickets}/></div><ResultPanel tickets={tickets} onSave={(r)=>saveCurrent(r)}/></div>}</main>
}
