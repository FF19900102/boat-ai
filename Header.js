'use client';
import {useMemo,useState} from 'react';
import Header from '../components/Header';
import {venues, createBoats} from '../lib/sampleData';
import {probabilities,trifectaRankings,aiComment} from '../lib/boatAi';

export default function Page(){
 const [venue,setVenue]=useState(venues[0]);
 const [race,setRace]=useState(1);
 const [boats,setBoats]=useState(createBoats(venues[0].id,1));
 const [result,setResult]=useState({finish:'',ticket:'',stake:1000,payout:0});
 const probs=useMemo(()=>probabilities(boats),[boats]);
 const tickets=useMemo(()=>trifectaRankings(boats),[boats]);
 const top=tickets[0];
 const hit=result.finish && result.ticket && result.finish===result.ticket;
 const profit=(hit?Number(result.payout):0)-Number(result.stake||0);
 function changeVenue(v){ setVenue(v); setBoats(createBoats(v.id,race)); }
 function changeRace(r){ setRace(r); setBoats(createBoats(venue.id,r)); }
 function updateBoat(index,key,value){ setBoats(prev=>prev.map((b,i)=>i===index?{...b,[key]:value}:b)); }
 function saveResult(){
   const item={id:Date.now(),venue:venue.name,race,finish:result.finish,ticket:result.ticket,stake:Number(result.stake),payout:hit?Number(result.payout):0,profit,createdAt:new Date().toISOString()};
   const old=JSON.parse(localStorage.getItem('boat-ai-results')||'[]');
   localStorage.setItem('boat-ai-results',JSON.stringify([item,...old].slice(0,200)));
   alert('結果を保存しました');
 }
 return <main><Header/>
  <section className="hero"><div><h1>本日開催</h1><p>開催場 → レース → AI予想 → 期待値 → 結果保存</p></div><div className="badge">STEP 6</div></section>
  <section className="card"><h2>開催場</h2><div className="grid venueGrid">{venues.map(v=><button key={v.id} onClick={()=>changeVenue(v)} className={venue.id===v.id?'active venue':'venue'}><b>{v.name}</b><span>{v.area} / {v.status}</span></button>)}</div></section>
  <section className="card"><h2>{venue.name} レース選択</h2><div className="raceGrid">{Array.from({length:12},(_,i)=>i+1).map(r=><button className={race===r?'active small':'small'} key={r} onClick={()=>changeRace(r)}>{r}R</button>)}</div></section>
  <section className="card"><h2>出走表入力</h2><div className="tableWrap"><table><thead><tr><th>枠</th><th>選手</th><th>級</th><th>全国</th><th>当地</th><th>ST</th><th>Motor</th><th>展示</th></tr></thead><tbody>{boats.map((b,i)=><tr key={b.frame}><td className={'frame f'+b.frame}>{b.frame}</td><td><input value={b.name} onChange={e=>updateBoat(i,'name',e.target.value)}/></td><td><input value={b.classRank} onChange={e=>updateBoat(i,'classRank',e.target.value)}/></td><td><input type="number" step="0.01" value={b.nationalWin} onChange={e=>updateBoat(i,'nationalWin',e.target.value)}/></td><td><input type="number" step="0.01" value={b.localWin} onChange={e=>updateBoat(i,'localWin',e.target.value)}/></td><td><input type="number" step="0.01" value={b.avgST} onChange={e=>updateBoat(i,'avgST',e.target.value)}/></td><td><input type="number" step="0.1" value={b.motorRate} onChange={e=>updateBoat(i,'motorRate',e.target.value)}/></td><td><input type="number" step="0.01" value={b.exhibition} onChange={e=>updateBoat(i,'exhibition',e.target.value)}/></td></tr>)}</tbody></table></div></section>
  <section className="cols"><div className="card"><h2>艇別AI確率</h2>{probs.map(b=><div className="prob" key={b.frame}><span className={'frame f'+b.frame}>{b.frame}</span><b>{b.name}</b><em>1着 {(b.firstProb*100).toFixed(1)}%</em><em>3連対 {(b.top3Prob*100).toFixed(1)}%</em></div>)}</div><div className="card"><h2>AI判断</h2><div className="bigEv">EV {top?.ev.toFixed(0)}</div><p>{aiComment(top)}</p><p className="muted">推奨：{top?.key} / 確率 {(top?.hitProb*100).toFixed(2)}% / オッズ {top?.odds}</p></div></section>
  <section className="card"><h2>3連単 期待値ランキング</h2><div className="tableWrap"><table><thead><tr><th>買い目</th><th>的中確率</th><th>オッズ</th><th>期待値</th><th>判定</th></tr></thead><tbody>{tickets.slice(0,15).map(t=><tr key={t.key}><td><b>{t.key}</b></td><td>{(t.hitProb*100).toFixed(2)}%</td><td>{t.odds}</td><td>{t.ev.toFixed(0)}</td><td><span className={t.ev>=120?'buy':t.ev>=100?'warn':'pass'}>{t.rank}</span></td></tr>)}</tbody></table></div></section>
  <section className="card"><h2>結果入力・保存</h2><div className="formGrid"><label>確定3連単<input placeholder="例 1-2-3" value={result.finish} onChange={e=>setResult({...result,finish:e.target.value})}/></label><label>購入買い目<input placeholder="例 1-2-3" value={result.ticket} onChange={e=>setResult({...result,ticket:e.target.value})}/></label><label>投資額<input type="number" value={result.stake} onChange={e=>setResult({...result,stake:e.target.value})}/></label><label>払戻金<input type="number" value={result.payout} onChange={e=>setResult({...result,payout:e.target.value})}/></label></div><div className="resultBox"><b>{result.finish? hit?'的中':'不的中':'結果待ち'}</b><span>収支 {profit.toLocaleString()}円</span><button onClick={saveResult}>保存</button></div></section>
 </main>
}
