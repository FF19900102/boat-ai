'use client';
import { useEffect, useMemo, useState } from 'react';
import { venues, makeRacers, defaultWeather } from '../lib/mock';
import { generateTrifectas, placeProbabilities } from '../lib/ai';
import { Racer, SavedRace, Weather } from '../lib/types';

const today = new Date().toISOString().slice(0,10);
const yen = (n:number)=>`${Math.round(n).toLocaleString()}円`;

export default function Home(){
  const [venue,setVenue]=useState(venues[5]);
  const [raceNo,setRaceNo]=useState(1);
  const [racers,setRacers]=useState<Racer[]>(makeRacers(61));
  const [weather,setWeather]=useState<Weather>(defaultWeather);
  const [odds,setOdds]=useState<Record<string,number>>({});
  const [bought,setBought]=useState<string[]>([]);
  const [stake,setStake]=useState(100);
  const [result,setResult]=useState('');
  const [payout,setPayout]=useState(0);
  const [history,setHistory]=useState<SavedRace[]>([]);

  useEffect(()=>{ setRacers(makeRacers(Number(venue.id)*10+raceNo)); setOdds({}); setBought([]); setResult(''); setPayout(0); },[venue,raceNo]);
  useEffect(()=>{ const raw=localStorage.getItem('boat-ai-history'); if(raw) setHistory(JSON.parse(raw)); },[]);

  const probs = useMemo(()=>placeProbabilities(racers,weather).sort((a,b)=>b.p1-a.p1),[racers,weather]);
  const trifectas = useMemo(()=>generateTrifectas(racers,weather,odds),[racers,weather,odds]);
  const top = trifectas.slice(0,12);
  const buyCandidates = trifectas.filter(t=>t.ev>=120).slice(0,8);
  const hit = bought.includes(result);
  const totalStake = bought.length * stake;
  const profit = hit ? payout - totalStake : -totalStake;
  const totalInvest = history.reduce((a,b)=>a+(b.bought.length*b.stake),0);
  const totalReturn = history.reduce((a,b)=>a+(b.hit?b.payout:0),0);
  const roi = totalInvest ? totalReturn/totalInvest*100 : 0;

  function updateRacer(i:number,key:keyof Racer,value:string){
    setRacers(prev=>prev.map((r,idx)=>idx===i?{...r,[key]: key==='name'||key==='className'?value:Number(value)}:r));
  }
  function toggleBuy(key:string){ setBought(prev=>prev.includes(key)?prev.filter(x=>x!==key):[...prev,key]); }
  function saveResult(){
    const item:SavedRace={id:crypto.randomUUID(),date:today,venue:venue.name,raceNo,racers,weather,trifectas,bought,stake,result,payout,hit,profit};
    const next=[item,...history]; setHistory(next); localStorage.setItem('boat-ai-history',JSON.stringify(next));
  }
  function clearHistory(){ localStorage.removeItem('boat-ai-history'); setHistory([]); }

  return <main className="wrap">
    <header className="header">
      <div className="brand"><h1>Boat AI</h1><p>確率・期待値・結果検証で競艇を分析</p></div>
      <div className="pill">{today} / v0.3 実コード</div>
    </header>

    <section className="card">
      <h2>本日開催場</h2>
      <div className="grid cols4">
        {venues.map(v=><button key={v.id} className={`btn venue ${venue.id===v.id?'active':''}`} onClick={()=>setVenue(v)}><strong>{v.name}</strong><span>{v.area} / {v.status}</span></button>)}
      </div>
    </section>

    <section className="grid cols2" style={{marginTop:14}}>
      <div className="card"><h2>{venue.name} レース選択</h2><div className="grid cols4">{Array.from({length:12},(_,i)=>i+1).map(n=><button key={n} className={`btn raceBtn ${raceNo===n?'active':''}`} onClick={()=>setRaceNo(n)}>{n}R</button>)}</div></div>
      <div className="card"><h2>水面・気象</h2><div className="grid cols2">
        <label><span className="label">天候</span><select value={weather.weather} onChange={e=>setWeather({...weather,weather:e.target.value})}><option>晴れ</option><option>曇り</option><option>雨</option></select></label>
        <label><span className="label">風向</span><select value={weather.windDir} onChange={e=>setWeather({...weather,windDir:e.target.value})}><option>向かい風</option><option>追い風</option><option>横風</option><option>無風</option></select></label>
        <label><span className="label">風速 m</span><input type="number" value={weather.windSpeed} onChange={e=>setWeather({...weather,windSpeed:Number(e.target.value)})}/></label>
        <label><span className="label">波高 cm</span><input type="number" value={weather.wave} onChange={e=>setWeather({...weather,wave:Number(e.target.value)})}/></label>
      </div></div>
    </section>

    <section className="card" style={{marginTop:14}}><h2>出走表入力</h2><div style={{overflowX:'auto'}}><table className="table"><thead><tr><th>艇</th><th>選手</th><th>級</th><th>全国</th><th>当地</th><th>ST</th><th>モーター</th><th>ボート</th><th>展示</th><th>チルト</th><th>体重</th><th>進入</th></tr></thead><tbody>{racers.map((r,i)=><tr key={r.lane}><td><span className="boatNo">{r.lane}</span></td><td><input value={r.name} onChange={e=>updateRacer(i,'name',e.target.value)}/></td><td><input value={r.className} onChange={e=>updateRacer(i,'className',e.target.value)}/></td><td><input type="number" step="0.01" value={r.nationalWin} onChange={e=>updateRacer(i,'nationalWin',e.target.value)}/></td><td><input type="number" step="0.01" value={r.localWin} onChange={e=>updateRacer(i,'localWin',e.target.value)}/></td><td><input type="number" step="0.01" value={r.st} onChange={e=>updateRacer(i,'st',e.target.value)}/></td><td><input type="number" step="0.1" value={r.motorRate} onChange={e=>updateRacer(i,'motorRate',e.target.value)}/></td><td><input type="number" step="0.1" value={r.boatRate} onChange={e=>updateRacer(i,'boatRate',e.target.value)}/></td><td><input type="number" step="0.01" value={r.exhibition} onChange={e=>updateRacer(i,'exhibition',e.target.value)}/></td><td><input type="number" step="0.5" value={r.tilt} onChange={e=>updateRacer(i,'tilt',e.target.value)}/></td><td><input type="number" step="0.1" value={r.weight} onChange={e=>updateRacer(i,'weight',e.target.value)}/></td><td><input type="number" value={r.entry} onChange={e=>updateRacer(i,'entry',e.target.value)}/></td></tr>)}</tbody></table></div></section>

    <section className="grid cols2" style={{marginTop:14}}>
      <div className="card"><h2>AI確率</h2><table className="table"><thead><tr><th>艇</th><th>スコア</th><th>1着率</th><th>2連対</th><th>3連対</th></tr></thead><tbody>{probs.map((p,i)=><tr key={p.lane}><td className={i===0?'rank1':i===1?'rank2':i===2?'rank3':''}>{p.lane}号艇</td><td>{p.score.toFixed(1)}</td><td>{(p.p1*100).toFixed(1)}%</td><td>{(p.p2*100).toFixed(1)}%</td><td>{(p.p3*100).toFixed(1)}%</td></tr>)}</tbody></table></div>
      <div className="card"><h2>AI判定</h2>{buyCandidates.length?<><p className="goodText">買い候補あり：{buyCandidates.length}点</p><p>最上位：<b>{buyCandidates[0].key}</b> / 期待値 {buyCandidates[0].ev.toFixed(1)}</p></>:<p className="badText">見送り推奨：期待値120以上なし</p>}<p className="muted">※現段階は数式AI。自動取得・本格学習は後続で追加。</p></div>
    </section>

    <section className="card" style={{marginTop:14}}><h2>3連単 期待値ランキング</h2><div style={{overflowX:'auto'}}><table className="table"><thead><tr><th>買う</th><th>買い目</th><th>的中率</th><th>オッズ</th><th>期待値</th><th>判定</th></tr></thead><tbody>{top.map(t=><tr key={t.key}><td><input type="checkbox" checked={bought.includes(t.key)} onChange={()=>toggleBuy(t.key)}/></td><td><b>{t.key}</b></td><td>{(t.probability*100).toFixed(2)}%</td><td><input type="number" step="0.1" value={odds[t.key] ?? t.odds} onChange={e=>setOdds({...odds,[t.key]:Number(e.target.value)})}/></td><td className={t.ev>=120?'goodText':t.ev>=100?'warnText':'muted'}>{t.ev.toFixed(1)}</td><td>{t.label}</td></tr>)}</tbody></table></div></section>

    <section className="grid cols2" style={{marginTop:14}}>
      <div className="card"><h2>結果入力</h2><div className="grid cols2"><label><span className="label">購入1点金額</span><input type="number" value={stake} onChange={e=>setStake(Number(e.target.value))}/></label><label><span className="label">確定3連単</span><input placeholder="例 1-3-2" value={result} onChange={e=>setResult(e.target.value)}/></label><label><span className="label">払戻金</span><input type="number" value={payout} onChange={e=>setPayout(Number(e.target.value))}/></label><div><span className="label">判定</span><div className={result && hit?'goodText':result?'badText':'muted'}>{result ? (hit?'的中':'不的中'):'未入力'}</div></div></div><p>投資 {yen(totalStake)} / 収支 <b className={profit>=0?'goodText':'badText'}>{yen(profit)}</b></p><button className="btn good" onClick={saveResult} disabled={!result || bought.length===0}>結果を保存</button></div>
      <div className="card"><h2>成績</h2><div className="summary"><div className="stat"><span>保存</span><b>{history.length}</b></div><div className="stat"><span>投資</span><b>{yen(totalInvest)}</b></div><div className="stat"><span>回収</span><b>{yen(totalReturn)}</b></div><div className="stat"><span>回収率</span><b>{roi.toFixed(1)}%</b></div></div><button className="btn danger" style={{marginTop:12}} onClick={clearHistory}>履歴クリア</button></div>
    </section>
  </main>;
}
