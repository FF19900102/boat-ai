'use client';
import { useMemo, useState } from 'react';
import Header from '@/components/Header';
import VenueSelector from '@/components/VenueSelector';
import RaceSelector from '@/components/RaceSelector';
import RacerTable from '@/components/RacerTable';
import WeatherForm from '@/components/WeatherForm';
import ProbabilityTable from '@/components/ProbabilityTable';
import TicketTable from '@/components/TicketTable';
import ResultPanel from '@/components/ResultPanel';
import Dashboard from '@/components/Dashboard';
import { aiComment } from '@/lib/boatAi';
import { defaultRacers, venues } from '@/lib/mockData';
import { Racer, Ticket, Weather } from '@/lib/types';

export default function Page(){
 const today=new Date().toISOString().slice(0,10);
 const [venue,setVenue]=useState('hamanako'); const [raceNo,setRaceNo]=useState(1); const [tab,setTab]=useState('race');
 const [racers,setRacers]=useState<Racer[]>(defaultRacers); const [weather,setWeather]=useState<Weather>({condition:'晴',windDirection:'向かい風',windSpeed:2,wave:2});
 const [oddsMap,setOddsMap]=useState<Record<string,number>>({}); const [tickets,setTickets]=useState<Ticket[]>([]); const [refresh,setRefresh]=useState(0);
 const venueName=useMemo(()=>venues.find(v=>v.id===venue)?.name || venue,[venue]);
 const raceBase={id:`${today}-${venue}-${raceNo}`,date:today,venue:venueName,raceNo,tickets,createdAt:new Date().toISOString()};
 const top=tickets[0];
 return <main className="wrap"><Header/><div className="tabs"><button className={`tab ${tab==='race'?'active':''}`} onClick={()=>setTab('race')}>予想</button><button className={`tab ${tab==='data'?'active':''}`} onClick={()=>setTab('data')}>入力</button><button className={`tab ${tab==='result'?'active':''}`} onClick={()=>setTab('result')}>結果</button><button className={`tab ${tab==='dashboard'?'active':''}`} onClick={()=>setTab('dashboard')}>成績</button></div>
 {tab==='race'&&<div className="grid"><section className="card"><h2 className="sectionTitle">本日開催場</h2><VenueSelector venues={venues} selected={venue} onSelect={setVenue}/></section><section className="card"><h2 className="sectionTitle">レース選択：{venueName}</h2><RaceSelector raceNo={raceNo} setRaceNo={setRaceNo}/></section><section className="card"><h2 className="sectionTitle">AI判定</h2><div className={top&&top.ev>=120?'notice':top&&top.ev<100?'notice dangerNotice':'notice'}>{aiComment(top)} {top&&<>最上位：<b>{top.combo}</b> / EV <b>{top.ev.toFixed(1)}</b></>}</div></section><section className="grid grid2"><div className="card"><h2 className="sectionTitle">各艇確率</h2><ProbabilityTable racers={racers} weather={weather}/></div><div className="card"><h2 className="sectionTitle">期待値ランキング TOP30</h2><TicketTable racers={racers} weather={weather} oddsMap={oddsMap} setOddsMap={setOddsMap} onTickets={setTickets}/></div></section></div>}
 {tab==='data'&&<div className="grid"><section className="card"><h2 className="sectionTitle">気象・水面</h2><WeatherForm weather={weather} setWeather={setWeather}/></section><section className="card"><h2 className="sectionTitle">出走表入力</h2><RacerTable racers={racers} setRacers={setRacers}/></section></div>}
 {tab==='result'&&<section className="card"><h2 className="sectionTitle">結果入力・保存</h2><ResultPanel race={raceBase} topTickets={tickets} onSaved={()=>setRefresh(refresh+1)}/></section>}
 {tab==='dashboard'&&<section className="card"><h2 className="sectionTitle">成績ダッシュボード</h2><Dashboard refresh={refresh}/></section>}
 <p className="small muted" style={{marginTop:18}}>現在は手入力＋localStorage保存版。次段階で公式データ取得API・DB・機械学習モデルに接続する設計です。</p></main>
}
