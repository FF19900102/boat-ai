'use client';
import {useMemo,useState} from 'react';
import {venues,races,makeBoats} from '../data/mockData';
import {probabilities,trifectas,judge} from '../lib/ai';
export default function Page(){
 const today=new Date().toLocaleDateString('ja-JP');
 const [venue,setVenue]=useState('浜名湖'); const [race,setRace]=useState('1R');
 const [boats,setBoats]=useState(()=>makeBoats('浜名湖','1R')); const [weather,setWeather]=useState({wind:'2',wave:'2',dir:'向かい風'});
 const rows=useMemo(()=>probabilities(boats),[boats]); const bets=useMemo(()=>trifectas(rows).slice(0,20),[rows]);
 const top=bets[0];
 function selectVenue(v){setVenue(v); setRace('1R'); setBoats(makeBoats(v,'1R'))}
 function selectRace(r){setRace(r); setBoats(makeBoats(venue,r))}
 function upd(i,k,val){setBoats(bs=>bs.map((b,idx)=>idx===i?{...b,[k]:val}:b))}
 return <main className="wrap">
  <div className="header"><div><div className="title">Boat AI</div><div className="sub">確率・期待値・見送り判定</div></div><div className="pill">{today}</div></div>
  <section className="card"><h2>本日開催場</h2><div className="grid cols3">{venues.map(v=><button key={v} onClick={()=>selectVenue(v)} className={'venue '+(venue===v?'active':'')}>{v}</button>)}</div></section>
  <section className="card" style={{marginTop:14}}><h2>{venue} レース選択</h2><div className="row">{races.map(r=><button key={r} onClick={()=>selectRace(r)} className={'race '+(race===r?'active':'')}>{r}</button>)}</div></section>
  <div className="grid cols2" style={{marginTop:14}}><section className="card"><h2>気象</h2><div className="grid cols3"><label>風向<select value={weather.dir} onChange={e=>setWeather({...weather,dir:e.target.value})}><option>向かい風</option><option>追い風</option><option>左横風</option><option>右横風</option></select></label><label>風速<input value={weather.wind} onChange={e=>setWeather({...weather,wind:e.target.value})}/></label><label>波高<input value={weather.wave} onChange={e=>setWeather({...weather,wave:e.target.value})}/></label></div></section><section className="card"><h2>AI判定</h2><div className="notice">{top?`${top.bet} / EV ${top.ev.toFixed(0)} / ${judge(top.ev)}`:'データ待ち'}</div><p className="muted">展示・オッズ自動取得は次フェーズで接続</p></section></div>
  <section className="card" style={{marginTop:14}}><h2>出走表入力</h2><table className="table"><thead><tr><th>艇</th><th>選手</th><th>級</th><th>全国</th><th>当地</th><th>ST</th><th>Motor</th><th>展示</th></tr></thead><tbody>{boats.map((b,i)=><tr key={b.lane}><td>{b.lane}</td><td><input value={b.name} onChange={e=>upd(i,'name',e.target.value)}/></td><td><input value={b.className} onChange={e=>upd(i,'className',e.target.value)}/></td><td><input value={b.national} onChange={e=>upd(i,'national',e.target.value)}/></td><td><input value={b.local} onChange={e=>upd(i,'local',e.target.value)}/></td><td><input value={b.st} onChange={e=>upd(i,'st',e.target.value)}/></td><td><input value={b.motor} onChange={e=>upd(i,'motor',e.target.value)}/></td><td><input value={b.exhibition} onChange={e=>upd(i,'exhibition',e.target.value)}/></td></tr>)}</tbody></table></section>
  <div className="grid cols2" style={{marginTop:14}}><section className="card"><h2>確率ランキング</h2><table className="table"><thead><tr><th>艇</th><th>選手</th><th>1着</th><th>2連</th><th>3連</th></tr></thead><tbody>{rows.map((r,i)=><tr key={r.lane}><td className={i===0?'rank1':i===1?'rank2':'rank3'}>{r.lane}</td><td>{r.name}</td><td>{(r.p1*100).toFixed(1)}%</td><td>{(r.p2*100).toFixed(1)}%</td><td>{(r.p3*100).toFixed(1)}%</td></tr>)}</tbody></table></section><section className="card"><h2>期待値ランキング</h2><table className="table"><thead><tr><th>買い目</th><th>確率</th><th>推定オッズ</th><th>EV</th><th>判定</th></tr></thead><tbody>{bets.slice(0,10).map(b=><tr key={b.bet}><td>{b.bet}</td><td>{(b.prob*100).toFixed(2)}%</td><td>{b.odds}</td><td className={b.ev>=120?'evGood':b.ev>=100?'evWarn':'evBad'}>{b.ev.toFixed(0)}</td><td>{judge(b.ev)}</td></tr>)}</tbody></table></section></div>
 </main>
}
