'use client';
import { useEffect, useMemo, useState } from 'react';
import { defaultRacers, grade, makeTickets, predict, Racer, venues } from '@/lib/boatAi';

type HistoryItem = {
  id:string; date:string; venue:string; race:number; result:string; bestCombo:string; hit:boolean;
  stake:number; payout:number; profit:number; bestEv:number; savedAt:string;
};
const STORAGE_KEY='boat-ai-history-v18';

export default function BoatAiApp(){
  const today = new Date().toISOString().slice(0,10);
  const [venue,setVenue]=useState('浜名湖');
  const [race,setRace]=useState(1);
  const [racers,setRacers]=useState<Racer[]>(defaultRacers());
  const [weather,setWeather]=useState({wind:2,wave:2,direction:'向かい風'});
  const [result,setResult]=useState('');
  const [stake,setStake]=useState(1000);
  const [history,setHistory]=useState<HistoryItem[]>([]);

  useEffect(()=>{
    try{ setHistory(JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')); }catch{ setHistory([]); }
  },[]);

  const predictions = useMemo(()=>predict(racers,weather),[racers,weather]);
  const tickets = useMemo(()=>makeTickets(predictions),[predictions]);
  const best = tickets[0];
  const hit = !!result && best?.combo === result;
  const payout = hit ? Math.round(best.odds*stake) : 0;
  const profit = result ? payout - stake : 0;

  const stats = useMemo(()=>{
    const total=history.length;
    const investment=history.reduce((s,h)=>s+h.stake,0);
    const returns=history.reduce((s,h)=>s+h.payout,0);
    const profit=returns-investment;
    const hits=history.filter(h=>h.hit).length;
    const roi=investment? Math.round((returns/investment)*1000)/10 : 0;
    const hitRate=total? Math.round((hits/total)*1000)/10 : 0;
    const byVenue=venues.map(v=>{
      const list=history.filter(h=>h.venue===v);
      const inv=list.reduce((s,h)=>s+h.stake,0);
      const ret=list.reduce((s,h)=>s+h.payout,0);
      return {venue:v,count:list.length,roi:inv?Math.round((ret/inv)*1000)/10:0,profit:ret-inv};
    }).filter(x=>x.count>0).sort((a,b)=>b.profit-a.profit);
    return {total,investment,returns,profit,hits,roi,hitRate,byVenue};
  },[history]);

  const updateRacer=(i:number,key:keyof Racer,value:string)=>setRacers(rs=>rs.map((r,idx)=>idx===i?{...r,[key]: key==='name'||key==='className'?value:Number(value)}:r));
  const saveResult=()=>{
    if(!result || !best) return alert('結果を入力してください。例：1-3-2');
    const item:HistoryItem={id:crypto.randomUUID(),date:today,venue,race,result,bestCombo:best.combo,hit,stake,payout,profit,bestEv:best.ev,savedAt:new Date().toLocaleString('ja-JP')};
    const next=[item,...history];
    setHistory(next);
    localStorage.setItem(STORAGE_KEY,JSON.stringify(next));
    setResult('');
  };
  const clearHistory=()=>{ if(confirm('保存履歴を削除しますか？')){ setHistory([]); localStorage.removeItem(STORAGE_KEY); } };

  return <div className="wrap">
    <div className="header"><div><div className="brand">Boat AI</div><div className="sub">確率・期待値・結果検証・成績保存</div></div><div className="sub">{today}</div></div>

    <div className="grid cols2">
      <section className="card"><h2 className="section-title">本日開催場</h2><div className="venue-list">{venues.map(v=><button key={v} onClick={()=>setVenue(v)} className={`btn small ${venue===v?'active':''}`}>{v}</button>)}</div></section>
      <section className="card"><h2 className="section-title">レース選択</h2><div className="race-list">{Array.from({length:12},(_,i)=>i+1).map(r=><button key={r} onClick={()=>setRace(r)} className={`btn small ${race===r?'active':''}`}>{r}R</button>)}</div></section>
    </div>

    <div className="grid cols3" style={{marginTop:14}}>
      <section className="card"><h2 className="section-title">選択中</h2><div className="big">{venue} {race}R</div><div className="sub">後で公式データ取得を接続</div></section>
      <section className="card"><h2 className="section-title">気象</h2><div className="grid cols3"><label>風速<input type="number" value={weather.wind} onChange={e=>setWeather({...weather,wind:Number(e.target.value)})}/></label><label>波高<input type="number" value={weather.wave} onChange={e=>setWeather({...weather,wave:Number(e.target.value)})}/></label><label>風向<select value={weather.direction} onChange={e=>setWeather({...weather,direction:e.target.value})}><option>向かい風</option><option>追い風</option><option>横風</option></select></label></div></section>
      <section className="card"><h2 className="section-title">AI判定</h2><div className="big">{grade(best?.ev||0)}</div><div>{best?.ev>=120?'購入候補あり':'見送り寄り'}</div><div className="sub">最高EV {best?.ev}</div></section>
    </div>

    <section className="card" style={{marginTop:14,overflowX:'auto'}}><h2 className="section-title">出走表入力</h2><table><thead><tr><th>枠</th><th>選手</th><th>級</th><th>全国</th><th>当地</th><th>ST</th><th>Motor%</th><th>Boat%</th><th>展示</th><th>オッズ</th></tr></thead><tbody>{racers.map((r,i)=><tr key={r.frame}><td>{r.frame}</td><td><input value={r.name} onChange={e=>updateRacer(i,'name',e.target.value)}/></td><td><input value={r.className} onChange={e=>updateRacer(i,'className',e.target.value)}/></td>{(['nationalWin','localWin','avgSt','motorRate','boatRate','exhibition','odds'] as (keyof Racer)[]).map(k=><td key={k}><input className="num" type="number" step="0.01" value={r[k] as number} onChange={e=>updateRacer(i,k,e.target.value)}/></td>)}</tr>)}</tbody></table></section>

    <div className="grid cols2" style={{marginTop:14}}>
      <section className="card"><h2 className="section-title">各艇確率</h2><table><thead><tr><th>順位</th><th>艇</th><th>選手</th><th>1着率</th><th>2連対</th><th>3連対</th></tr></thead><tbody>{predictions.map((p,i)=><tr key={p.frame}><td className={i===0?'rank1':''}>{i+1}</td><td>{p.frame}</td><td>{p.name}</td><td>{(p.winProb*100).toFixed(1)}%</td><td>{(p.top2*100).toFixed(1)}%</td><td>{(p.top3*100).toFixed(1)}%</td></tr>)}</tbody></table></section>
      <section className="card"><h2 className="section-title">期待値ランキング</h2><table><thead><tr><th>買い目</th><th>確率</th><th>想定Odds</th><th>EV</th><th>判定</th></tr></thead><tbody>{tickets.slice(0,10).map(t=><tr key={t.combo}><td className="rank1">{t.combo}</td><td>{(t.prob*100).toFixed(2)}%</td><td>{t.odds}</td><td>{t.ev}</td><td><span className={`pill ${t.ev>=120?'good':t.ev>=100?'warn':'bad'}`}>{t.label}</span></td></tr>)}</tbody></table></section>
    </div>

    <section className="card" style={{marginTop:14}}><h2 className="section-title">結果入力・保存</h2><div className="grid cols3"><label>3連単結果<input placeholder="例 1-3-2" value={result} onChange={e=>setResult(e.target.value)}/></label><label>投資額<input type="number" value={stake} onChange={e=>setStake(Number(e.target.value))}/></label><div><div className="sub">判定</div><div className="big">{result? hit?'的中':'不的中':'結果待ち'}</div></div></div>{result&&<div className="stat"><span>払戻 / 収支</span><b>{payout.toLocaleString()}円 / {profit.toLocaleString()}円</b></div>}<button className="btn primary" onClick={saveResult}>この結果を保存</button></section>

    <div className="grid cols3" style={{marginTop:14}}>
      <section className="card"><h2 className="section-title">全体成績</h2><div className="stat"><span>件数</span><b>{stats.total}</b></div><div className="stat"><span>的中率</span><b>{stats.hitRate}%</b></div><div className="stat"><span>回収率</span><b>{stats.roi}%</b></div></section>
      <section className="card"><h2 className="section-title">収支</h2><div className="stat"><span>投資</span><b>{stats.investment.toLocaleString()}円</b></div><div className="stat"><span>払戻</span><b>{stats.returns.toLocaleString()}円</b></div><div className="stat"><span>損益</span><b>{stats.profit.toLocaleString()}円</b></div></section>
      <section className="card"><h2 className="section-title">場別上位</h2>{stats.byVenue.slice(0,4).map(v=><div className="stat" key={v.venue}><span>{v.venue} {v.count}件</span><b>{v.roi}%</b></div>)}{!stats.byVenue.length&&<div className="sub">保存後に表示</div>}</section>
    </div>

    <section className="card" style={{marginTop:14,overflowX:'auto'}}><h2 className="section-title">保存履歴</h2><table><thead><tr><th>日時</th><th>場</th><th>R</th><th>推奨</th><th>結果</th><th>判定</th><th>収支</th></tr></thead><tbody>{history.slice(0,20).map(h=><tr key={h.id}><td>{h.savedAt}</td><td>{h.venue}</td><td>{h.race}R</td><td>{h.bestCombo}</td><td>{h.result}</td><td>{h.hit?'的中':'不的中'}</td><td>{h.profit.toLocaleString()}円</td></tr>)}</tbody></table>{history.length>0&&<button className="btn warn" onClick={clearHistory}>履歴削除</button>}</section>

    <div className="footer">v0.18 local demo / 次はAI別リーグ戦・CSV出力</div>
  </div>
}
