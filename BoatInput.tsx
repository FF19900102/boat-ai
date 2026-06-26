'use client';
import { useEffect, useMemo, useState } from 'react';
import BoatInput from '@/components/BoatInput';
import { Boat, RaceInfo, SavedRace } from '@/lib/types';
import { calcProbabilities } from '@/lib/ai';
const venues=['桐生','戸田','江戸川','平和島','多摩川','浜名湖','蒲郡','常滑','津','三国','びわこ','住之江','尼崎','鳴門','丸亀','児島','宮島','徳山','下関','若松','芦屋','福岡','唐津','大村'];
const blankBoats=():Boat[]=>[1,2,3,4,5,6].map(n=>({frame:n,name:'',className:'A1',nationalWin:5.5,localWin:5.5,avgST:0.16,motorRate:35,boatRate:33,exhibition:6.85,tilt:0,weight:52,course:n}));
export default function Page(){
 const today=new Date().toISOString().slice(0,10);
 const [race,setRace]=useState<RaceInfo>({date:today,venue:'浜名湖',raceNo:1,weather:'晴',windDir:'向かい風',windSpeed:2,wave:2});
 const [boats,setBoats]=useState<Boat[]>(blankBoats());
 const [saved,setSaved]=useState<SavedRace[]>([]);
 useEffect(()=>{setSaved(JSON.parse(localStorage.getItem('boat_ai_races')||'[]'))},[]);
 const ranked=useMemo(()=>calcProbabilities(boats),[boats]);
 const save=()=>{const item={id:crypto.randomUUID(),race,boats,createdAt:new Date().toISOString()};const next=[item,...saved].slice(0,50);setSaved(next);localStorage.setItem('boat_ai_races',JSON.stringify(next));alert('保存しました')};
 return <main className="wrap"><div className="top"><div><h1 className="title">Boat AI</h1><div className="muted">出走表入力・保存・AI確率計算</div></div><button className="btn" onClick={save}>このレースを保存</button></div>
 <div className="card"><h2>開催場選択</h2><div className="grid">{venues.map(v=><button key={v} className={'venue '+(race.venue===v?'active':'')} onClick={()=>setRace({...race,venue:v})}>{v}</button>)}</div></div>
 <div className="card"><h2>レース情報</h2><div className="grid"><div><label>日付</label><input className="input" type="date" value={race.date} onChange={e=>setRace({...race,date:e.target.value})}/></div><div><label>レース</label><select value={race.raceNo} onChange={e=>setRace({...race,raceNo:Number(e.target.value)})}>{Array.from({length:12},(_,i)=><option key={i+1}>{i+1}</option>)}</select></div><div><label>天候</label><input className="input" value={race.weather} onChange={e=>setRace({...race,weather:e.target.value})}/></div><div><label>風向</label><input className="input" value={race.windDir} onChange={e=>setRace({...race,windDir:e.target.value})}/></div><div><label>風速m</label><input className="input" type="number" value={race.windSpeed} onChange={e=>setRace({...race,windSpeed:Number(e.target.value)})}/></div><div><label>波cm</label><input className="input" type="number" value={race.wave} onChange={e=>setRace({...race,wave:Number(e.target.value)})}/></div></div></div>
 <BoatInput boats={boats} setBoats={setBoats}/>
 <div className="card"><h2>AI確率ランキング</h2><table className="table"><thead><tr><th>順位</th><th>艇</th><th>選手</th><th>スコア</th><th>1着率</th><th>2着以内</th><th>3着以内</th></tr></thead><tbody>{ranked.map((b,i)=><tr key={b.frame}><td>{i+1}</td><td>{b.frame}号艇</td><td>{b.name||'未入力'}</td><td>{b.score}</td><td className="ok">{b.p1}%</td><td>{b.p2}%</td><td>{b.p3}%</td></tr>)}</tbody></table></div>
 <div className="card"><h2>保存済み</h2>{saved.length===0?<p className="muted">まだ保存なし</p>:saved.slice(0,10).map(s=><div className="row" key={s.id}><span className="pill">{s.race.date}</span><b>{s.race.venue} {s.race.raceNo}R</b><span className="muted">{s.boats.map(b=>b.name||`${b.frame}号艇`).join(' / ')}</span></div>)}</div>
 </main>
}
