'use client';
import { useMemo, useState } from 'react';
import { defaultRacers, grade, makeTickets, predict, Racer, venues } from '@/lib/boatAi';

export default function BoatAiApp(){
  const today = new Date().toISOString().slice(0,10);
  const [venue,setVenue]=useState('浜名湖');
  const [race,setRace]=useState(1);
  const [racers,setRacers]=useState<Racer[]>(defaultRacers());
  const [weather,setWeather]=useState({wind:2,wave:2,direction:'向かい風'});
  const [result,setResult]=useState('');
  const [stake,setStake]=useState(1000);
  const predictions = useMemo(()=>predict(racers,weather),[racers,weather]);
  const tickets = useMemo(()=>makeTickets(predictions),[predictions]);
  const best = tickets[0];
  const hit = result && best?.combo === result;
  const profit = hit ? Math.round(best.odds*stake-stake) : result ? -stake : 0;
  const updateRacer=(i:number,key:keyof Racer,value:string)=>setRacers(rs=>rs.map((r,idx)=>idx===i?{...r,[key]: key==='name'||key==='className'?value:Number(value)}:r));
  return <div className="wrap">
    <div className="header"><div><div className="brand">Boat AI</div><div className="sub">確率・期待値・結果検証</div></div><div className="sub">{today}</div></div>
    <div className="grid cols2">
      <section className="card"><h2 className="section-title">本日開催場</h2><div className="venue-list">{venues.map(v=><button key={v} onClick={()=>setVenue(v)} className={`btn small ${venue===v?'active':''}`}>{v}</button>)}</div></section>
      <section className="card"><h2 className="section-title">レース選択</h2><div className="race-list">{Array.from({length:12},(_,i)=>i+1).map(r=><button key={r} onClick={()=>setRace(r)} className={`btn small ${race===r?'active':''}`}>{r}R</button>)}</div></section>
    </div>
    <div className="grid cols3" style={{marginTop:14}}>
      <section className="card"><h2 className="section-title">選択中</h2><div className="big">{venue} {race}R</div><div className="sub">ここに後で公式データ取得を接続</div></section>
      <section className="card"><h2 className="section-title">気象</h2><div className="grid cols3"><label>風速<input type="number" value={weather.wind} onChange={e=>setWeather({...weather,wind:Number(e.target.value)})}/></label><label>波高<input type="number" value={weather.wave} onChange={e=>setWeather({...weather,wave:Number(e.target.value)})}/></label><label>風向<select value={weather.direction} onChange={e=>setWeather({...weather,direction:e.target.value})}><option>向かい風</option><option>追い風</option><option>横風</option></select></label></div></section>
      <section className="card"><h2 className="section-title">AI判定</h2><div className="big">{grade(best?.ev||0)}</div><div>{best?.ev>=120?'購入候補あり':'見送り寄り'}</div><div className="sub">最高EV {best?.ev}</div></section>
    </div>
    <section className="card" style={{marginTop:14,overflowX:'auto'}}><h2 className="section-title">出走表入力</h2><table><thead><tr><th>枠</th><th>選手</th><th>級</th><th>全国</th><th>当地</th><th>ST</th><th>Motor%</th><th>Boat%</th><th>展示</th><th>オッズ</th></tr></thead><tbody>{racers.map((r,i)=><tr key={r.frame}><td>{r.frame}</td><td><input value={r.name} onChange={e=>updateRacer(i,'name',e.target.value)}/></td><td><input value={r.className} onChange={e=>updateRacer(i,'className',e.target.value)}/></td>{(['nationalWin','localWin','avgSt','motorRate','boatRate','exhibition','odds'] as (keyof Racer)[]).map(k=><td key={k}><input className="num" type="number" step="0.01" value={r[k] as number} onChange={e=>updateRacer(i,k,e.target.value)}/></td>)}</tr>)}</tbody></table></section>
    <div className="grid cols2" style={{marginTop:14}}>
      <section className="card"><h2 className="section-title">各艇確率</h2><table><thead><tr><th>順位</th><th>艇</th><th>選手</th><th>1着率</th><th>2連対</th><th>3連対</th></tr></thead><tbody>{predictions.map((p,i)=><tr key={p.frame}><td className={i===0?'rank1':''}>{i+1}</td><td>{p.frame}</td><td>{p.name}</td><td>{(p.winProb*100).toFixed(1)}%</td><td>{(p.top2*100).toFixed(1)}%</td><td>{(p.top3*100).toFixed(1)}%</td></tr>)}</tbody></table></section>
      <section className="card"><h2 className="section-title">期待値ランキング</h2><table><thead><tr><th>買い目</th><th>確率</th><th>想定Odds</th><th>EV</th><th>判定</th></tr></thead><tbody>{tickets.slice(0,10).map(t=><tr key={t.combo}><td className="rank1">{t.combo}</td><td>{(t.prob*100).toFixed(2)}%</td><td>{t.odds}</td><td>{t.ev}</td><td><span className={`pill ${t.ev>=120?'good':t.ev>=100?'warn':'bad'}`}>{t.label}</span></td></tr>)}</tbody></table></section>
    </div>
    <section className="card" style={{marginTop:14}}><h2 className="section-title">結果入力</h2><div className="grid cols3"><label>3連単結果<input placeholder="例 1-3-2" value={result} onChange={e=>setResult(e.target.value)}/></label><label>投資額<input type="number" value={stake} onChange={e=>setStake(Number(e.target.value))}/></label><div><div className="sub">判定</div><div className="big">{result? hit?'的中':'不的中':'結果待ち'}</div></div></div>{result&&<div className="stat"><span>収支</span><b>{profit.toLocaleString()}円</b></div>}</section>
    <div className="footer">v0.17 local demo / 次は保存履歴・成績ダッシュボードを追加</div>
  </div>
}
