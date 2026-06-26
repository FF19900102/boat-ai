'use client';
import {useMemo,useState} from 'react';
import {venues, venueStatus, makeBoats} from '../data/mockData';
import {predict,trifecta,judge} from '../lib/boatAi';

export default function App(){
 const today = new Date().toLocaleDateString('ja-JP');
 const activeVenues = venues.filter(v=>venueStatus[v]);
 const [venue,setVenue]=useState(activeVenues[0]||'浜名湖');
 const [race,setRace]=useState(1);
 const [boats,setBoats]=useState(()=>makeBoats(activeVenues[0]||'浜名湖',1));
 const [result,setResult]=useState('');
 const [bet,setBet]=useState('');
 const [stake,setStake]=useState(1000);
 const [payout,setPayout]=useState(0);
 const pred=useMemo(()=>predict(boats),[boats]);
 const tickets=useMemo(()=>trifecta(pred),[pred]);
 const top=tickets[0];
 function changeVenue(v){setVenue(v);setRace(1);setBoats(makeBoats(v,1));}
 function changeRace(r){setRace(r);setBoats(makeBoats(venue,r));setResult('');setBet('');setPayout(0)}
 function updateBoat(i,key,val){setBoats(bs=>bs.map((b,idx)=>idx===i?{...b,[key]:val}:b));}
 const hit = result && bet && result.trim()===bet.trim();
 const profit = hit ? Number(payout)-Number(stake) : -Number(stake);
 return <main className="wrap">
  <div className="header"><div><div className="brand">Boat AI</div><div className="sub">{today} / 確率・期待値・結果検証</div></div><button onClick={()=>alert('次フェーズで公式データ取得APIを接続')}>速報取得</button></div>
  <div className="card section"><b>本日開催場</b><div className="grid section">{activeVenues.map(v=><div key={v} onClick={()=>changeVenue(v)} className={`card venue ${venue===v?'active':''}`}><b>{v}</b><div className="small">{venueStatus[v]}</div></div>)}</div></div>
  <div className="card section"><b>{venue} レース選択</b><div className="races section">{Array.from({length:12},(_,i)=>i+1).map(r=><button key={r} onClick={()=>changeRace(r)} className={`race ${race===r?'active':''}`}>{r}R</button>)}</div></div>
  <div className="cols section">
   <div className="card"><b>{venue} {race}R 出走表</b><table className="section"><thead><tr><th>枠</th><th>選手</th><th>級</th><th>全国</th><th>当地</th><th>ST</th><th>Motor</th><th>展示</th></tr></thead><tbody>{boats.map((b,i)=><tr key={b.lane}><td>{b.lane}</td><td><input value={b.name} onChange={e=>updateBoat(i,'name',e.target.value)}/></td><td><input value={b.className} onChange={e=>updateBoat(i,'className',e.target.value)}/></td><td><input value={b.national} onChange={e=>updateBoat(i,'national',e.target.value)}/></td><td><input value={b.local} onChange={e=>updateBoat(i,'local',e.target.value)}/></td><td><input value={b.st} onChange={e=>updateBoat(i,'st',e.target.value)}/></td><td><input value={b.motor} onChange={e=>updateBoat(i,'motor',e.target.value)}/></td><td><input value={b.display} onChange={e=>updateBoat(i,'display',e.target.value)}/></td></tr>)}</tbody></table></div>
   <div className="card"><b>AI判断</b><div className="section rank">{top?.ticket}</div><div>期待値 <b className={top?.ev>=120?'good':top?.ev>=100?'warn':'bad'}>{top?.ev.toFixed(1)}</b></div><div>判定：<span className="pill">{judge(top?.ev||0)}</span></div><div className="small section">AI信頼度：{Math.min(95,Math.round((top?.ev||0)/1.6))}%</div></div>
  </div>
  <div className="cols section">
   <div className="card"><b>各艇確率</b><table className="section"><thead><tr><th>順位</th><th>艇</th><th>選手</th><th>1着率</th><th>2連対</th><th>3連対</th><th>Score</th></tr></thead><tbody>{pred.map((b,i)=><tr key={b.lane}><td>{i+1}</td><td>{b.lane}</td><td>{b.name}</td><td>{(b.p1*100).toFixed(1)}%</td><td>{(b.p2*100).toFixed(1)}%</td><td>{(b.p3*100).toFixed(1)}%</td><td>{b.score.toFixed(1)}</td></tr>)}</tbody></table></div>
   <div className="card"><b>結果反映</b><div className="section"><label>購入買い目</label><input placeholder="1-2-3" value={bet} onChange={e=>setBet(e.target.value)}/></div><div className="section"><label>確定結果</label><input placeholder="1-2-3" value={result} onChange={e=>setResult(e.target.value)}/></div><div className="section"><label>投資額</label><input type="number" value={stake} onChange={e=>setStake(e.target.value)}/></div><div className="section"><label>払戻</label><input type="number" value={payout} onChange={e=>setPayout(e.target.value)}/></div><div className="section rank">{result?hit?'的中':'不的中':'結果待ち'}</div><div className={profit>=0?'good':'bad'}>収支 {profit.toLocaleString()}円</div></div>
  </div>
  <div className="card section"><b>3連単 期待値ランキング</b><table className="section"><thead><tr><th>買い目</th><th>的中率</th><th>想定オッズ</th><th>期待値</th><th>判定</th></tr></thead><tbody>{tickets.map(t=><tr key={t.ticket}><td><b>{t.ticket}</b></td><td>{(t.prob*100).toFixed(2)}%</td><td>{t.odds.toFixed(1)}</td><td className={t.ev>=120?'good':t.ev>=100?'warn':'bad'}>{t.ev.toFixed(1)}</td><td>{judge(t.ev)}</td></tr>)}</tbody></table></div>
 </main>
}
