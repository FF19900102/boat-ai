'use client';
import { useMemo, useState } from 'react';
import BoatTable from '../components/BoatTable';
import { defaultBoats, generateTrifecta, predictBoats } from '../lib/boatAi';

const venues=['桐生','戸田','江戸川','平和島','多摩川','浜名湖','蒲郡','常滑','津','三国','びわこ','住之江','尼崎','鳴門','丸亀','児島','宮島','徳山','下関','若松','芦屋','福岡','唐津','大村'];
const races=Array.from({length:12},(_,i)=>`${i+1}R`);

export default function Page(){
  const [venue,setVenue]=useState('浜名湖');
  const [race,setRace]=useState('1R');
  const [boats,setBoats]=useState(defaultBoats);
  const [odds,setOdds]=useState<Record<string,number>>({'1-2-3':12.5,'1-3-2':15.8,'3-1-2':38.2});
  const preds=useMemo(()=>predictBoats(boats),[boats]);
  const trifecta=useMemo(()=>generateTrifecta(preds,odds),[preds,odds]);
  const topEv=trifecta.filter(x=>x.odds>0).slice(0,10);
  const setOdd=(key:string,val:string)=>setOdds({...odds,[key]:Number(val)});
  return <main className="wrap">
    <div className="header"><div><div className="brand">Boat AI</div><div className="sub">確率・期待値・見送り判定</div></div><span className="pill">REAL CODE v3</span></div>

    <section className="card"><h2 style={{marginTop:0}}>本日開催場</h2><div className="grid">{venues.map(v=><div key={v} className={`card venue ${venue===v?'active':''}`} onClick={()=>setVenue(v)}><b>{v}</b><div className="small">開催中</div></div>)}</div></section>

    <section className="card section"><h2 style={{marginTop:0}}>{venue} レース選択</h2><div className="row">{races.map(r=><button key={r} className={`raceBtn ${race===r?'active':''}`} onClick={()=>setRace(r)}>{r}</button>)}</div></section>

    <section className="section"><BoatTable boats={boats} setBoats={setBoats}/></section>

    <section className="section rank">
      <div className="card"><h2>艇別確率</h2><table className="table"><thead><tr><th>艇</th><th>選手</th><th>1着率</th><th>2連対</th><th>3連対</th></tr></thead><tbody>{preds.map(p=><tr key={p.frame}><td>{p.frame}</td><td>{p.name}</td><td className="score">{(p.winProb*100).toFixed(1)}%</td><td>{(p.top2Prob*100).toFixed(1)}%</td><td>{(p.top3Prob*100).toFixed(1)}%</td></tr>)}</tbody></table></div>
      <div className="card"><h2>オッズ入力</h2><div className="small">よく買う買い目だけ入力。120通り対応は次で表にします。</div>{['1-2-3','1-3-2','2-1-3','2-3-1','3-1-2','3-2-1','1-4-2','1-2-4'].map(k=><div className="row" key={k} style={{marginTop:8}}><b style={{width:70}}>{k}</b><input className="input" style={{maxWidth:140}} type="number" step="0.1" value={odds[k]||''} onChange={e=>setOdd(k,e.target.value)} placeholder="オッズ"/></div>)}</div>
    </section>

    <section className="card section"><h2>期待値ランキング</h2><table className="table"><thead><tr><th>買い目</th><th>的中率</th><th>オッズ</th><th>期待値</th><th>判定</th></tr></thead><tbody>{topEv.map(x=><tr key={x.key}><td><b>{x.key}</b></td><td>{(x.probability*100).toFixed(2)}%</td><td>{x.odds.toFixed(1)}</td><td className={x.ev>=120?'good':x.ev>=100?'warn':'bad'}>{x.ev.toFixed(0)}</td><td>{x.decision}</td></tr>)}</tbody></table>{topEv.length===0&&<p>オッズを入力してください。</p>}</section>

    <section className="card section"><h2>AI判定</h2><div className="big">{topEv.some(x=>x.ev>=120)?'買い候補あり':'見送り推奨'}</div><p className="sub">{venue} {race} / 期待値120以上を買い候補として判定</p></section>
    <div className="footer">次：120通りオッズ表・結果入力・収支保存</div>
  </main>
}
