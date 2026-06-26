'use client';
import {useMemo,useState} from 'react';
import {venues,sampleBoats} from '../lib/data';
import {probabilities,trifectaRank,judge} from '../lib/engine';

export default function Page(){
 const today=new Date().toISOString().slice(0,10);
 const [venue,setVenue]=useState('浜名湖'); const [race,setRace]=useState(1);
 const [boats,setBoats]=useState(sampleBoats); const [weather,setWeather]=useState({sky:'晴',wind:2,windDir:'北西',wave:2});
 const [stake,setStake]=useState(1000); const [result,setResult]=useState(''); const [payout,setPayout]=useState(0);
 const probs=useMemo(()=>probabilities(boats,weather),[boats,weather]);
 const tickets=useMemo(()=>trifectaRank(boats,weather,{}).slice(0,12),[boats,weather]);
 const best=tickets[0]; const [label,cls]=judge(best?.ev||0);
 const updateBoat=(i,k,v)=>setBoats(bs=>bs.map((b,idx)=>idx===i?{...b,[k]:v}:b));
 const hit=result && tickets.slice(0,5).some(t=>t.key===result);
 const profit=hit?Number(payout)-Number(stake):-Number(stake);
 return <main className="wrap">
  <div className="top"><div className="brand"><h1>Boat AI</h1><p>確率・期待値・結果検証で競艇を分析</p></div><div className="card"><b>{today}</b><div className="muted">本日開催デモ / API接続準備済み</div></div></div>
  <div className="grid">
   <aside className="card"><h2 className="sectionTitle">開催場</h2><div className="venues">{venues.map(v=><button key={v} onClick={()=>setVenue(v)} className={'btn '+(venue===v?'active':'')}>{v}</button>)}</div><div className="spacer"/><h2 className="sectionTitle">レース</h2><div className="races">{Array.from({length:12},(_,i)=>i+1).map(r=><button key={r} onClick={()=>setRace(r)} className={'btn '+(race===r?'active':'')}>{r}R</button>)}</div><div className="spacer"/><h2 className="sectionTitle">気象</h2><div className="row"><select value={weather.sky} onChange={e=>setWeather({...weather,sky:e.target.value})}><option>晴</option><option>曇</option><option>雨</option></select><input value={weather.windDir} onChange={e=>setWeather({...weather,windDir:e.target.value})}/><input type="number" value={weather.wind} onChange={e=>setWeather({...weather,wind:e.target.value})} placeholder="風速"/><input type="number" value={weather.wave} onChange={e=>setWeather({...weather,wave:e.target.value})} placeholder="波高"/></div></aside>
   <section>
    <div className="card"><h2 className="sectionTitle">{venue} {race}R 出走表</h2><table><thead><tr><th>枠</th><th>選手</th><th>級</th><th>全国</th><th>当地</th><th>ST</th><th>モーター</th><th>展示</th></tr></thead><tbody>{boats.map((b,i)=><tr key={b.frame}><td>{b.frame}</td><td><input value={b.name} onChange={e=>updateBoat(i,'name',e.target.value)}/></td><td><select value={b.class} onChange={e=>updateBoat(i,'class',e.target.value)}><option>A1</option><option>A2</option><option>B1</option><option>B2</option></select></td><td><input type="number" step="0.01" value={b.nat} onChange={e=>updateBoat(i,'nat',e.target.value)}/></td><td><input type="number" step="0.01" value={b.local} onChange={e=>updateBoat(i,'local',e.target.value)}/></td><td><input type="number" step="0.01" value={b.st} onChange={e=>updateBoat(i,'st',e.target.value)}/></td><td><input type="number" step="0.1" value={b.motor} onChange={e=>updateBoat(i,'motor',e.target.value)}/></td><td><input type="number" step="0.01" value={b.ex} onChange={e=>updateBoat(i,'ex',e.target.value)}/></td></tr>)}</tbody></table></div>
    <div className="spacer"/><div className="rank"><div className="card"><h2 className="sectionTitle">AI判定</h2><div className="num">{label}</div><span className={'pill '+cls}>期待値 {best?.ev.toFixed(0)}</span><p className="muted">上位5点を推奨。期待値が低い場合は見送り。</p></div><div className="card"><h2 className="sectionTitle">本命</h2><div className="num">{probs[0]?.frame}号艇</div><p>{probs[0]?.name}</p><b>{(probs[0]?.winProb*100).toFixed(1)}%</b></div><div className="card"><h2 className="sectionTitle">結果検証</h2><input placeholder="例 1-3-2" value={result} onChange={e=>setResult(e.target.value)}/><div className="spacer"/><input type="number" placeholder="払戻金" value={payout} onChange={e=>setPayout(e.target.value)}/><div className="spacer"/><input type="number" placeholder="投資額" value={stake} onChange={e=>setStake(e.target.value)}/><p><b>{result? (hit?'的中':'不的中'):'結果待ち'}</b> 収支 {profit.toLocaleString()}円</p></div></div>
    <div className="spacer"/><div className="card"><h2 className="sectionTitle">各艇確率</h2><table><thead><tr><th>枠</th><th>選手</th><th>1着率</th><th>2連対</th><th>3連対</th><th>スコア</th></tr></thead><tbody>{probs.map(p=><tr key={p.frame}><td>{p.frame}</td><td>{p.name}</td><td>{(p.winProb*100).toFixed(1)}%</td><td>{(p.top2Prob*100).toFixed(1)}%</td><td>{(p.top3Prob*100).toFixed(1)}%</td><td>{p.score.toFixed(1)}</td></tr>)}</tbody></table></div>
    <div className="spacer"/><div className="card"><h2 className="sectionTitle">3連単 期待値ランキング</h2><table><thead><tr><th>買い目</th><th>的中確率</th><th>推定オッズ</th><th>期待値</th><th>判定</th></tr></thead><tbody>{tickets.map(t=>{const j=judge(t.ev);return <tr key={t.key}><td><b>{t.key}</b></td><td>{(t.prob*100).toFixed(2)}%</td><td>{t.odds.toFixed(1)}</td><td>{t.ev.toFixed(0)}</td><td><span className={'pill '+j[1]}>{j[0]}</span></td></tr>})}</tbody></table></div>
   </section>
  </div>
 </main>
}
