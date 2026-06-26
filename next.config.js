'use client';

import { useMemo, useState } from 'react';
import { createRacers, todayVenues } from '../lib/mockData';
import { probabilities, trifecta, judge } from '../ai/engine';

export default function Home(){
  const [venue,setVenue]=useState(todayVenues[0]);
  const [raceNo,setRaceNo]=useState(1);
  const [weather,setWeather]=useState({sky:'晴れ',windDir:'向かい風',wind:3,wave:2});
  const [result,setResult]=useState('');
  const [stake,setStake]=useState(1000);
  const [history,setHistory]=useState([]);

  const racers=useMemo(()=>createRacers(venue,raceNo),[venue,raceNo]);
  const ranked=useMemo(()=>probabilities(racers),[racers]);
  const bets=useMemo(()=>trifecta(ranked),[ranked]);
  const decision=judge(bets);
  const races=Array.from({length:12},(_,i)=>i+1);

  function saveResult(){
    const hit=bets.slice(0,5).some(b=>b.bet===result);
    const top=bets[0];
    const pay=hit ? Math.round((top?.odds || 0) * stake) : 0;
    const rec={date:new Date().toLocaleString('ja-JP'),venue,raceNo,result,hit,stake,pay,profit:pay-stake,topBet:top?.bet};
    setHistory([rec,...history]);
  }

  const stats=history.reduce((s,h)=>({count:s.count+1,hit:s.hit+(h.hit?1:0),stake:s.stake+h.stake,pay:s.pay+h.pay}),{count:0,hit:0,stake:0,pay:0});
  const roi=stats.stake?Math.round(stats.pay/stats.stake*100):0;

  return <main className="wrap">
    <div className="header">
      <div>
        <div className="title">Boat AI</div>
        <div className="sub">競艇AI分析・確率・期待値・結果検証</div>
      </div>
      <div className="row">
        <span className="pill">Ver 1.0</span>
        <span className="pill">自動取得連携準備済み</span>
      </div>
    </div>

    <section className="card">
      <h2>本日開催場</h2>
      <div className="grid g4">
        {todayVenues.map(v=><button key={v} className={'btn '+(v===venue?'active':'')} onClick={()=>setVenue(v)}>{v}</button>)}
      </div>
    </section>

    <section className="grid g2" style={{marginTop:14}}>
      <div className="card">
        <h2>{venue} レース選択</h2>
        <div className="grid g4">
          {races.map(r=><button key={r} className={'btn '+(r===raceNo?'active':'')} onClick={()=>setRaceNo(r)}>{r}R</button>)}
        </div>
      </div>
      <div className="card">
        <h2>気象・水面</h2>
        <div className="grid g2">
          <label>天候<select value={weather.sky} onChange={e=>setWeather({...weather,sky:e.target.value})}><option>晴れ</option><option>曇り</option><option>雨</option></select></label>
          <label>風向<select value={weather.windDir} onChange={e=>setWeather({...weather,windDir:e.target.value})}><option>追い風</option><option>向かい風</option><option>横風</option></select></label>
          <label>風速<input type="number" value={weather.wind} onChange={e=>setWeather({...weather,wind:e.target.value})}/></label>
          <label>波高<input type="number" value={weather.wave} onChange={e=>setWeather({...weather,wave:e.target.value})}/></label>
        </div>
      </div>
    </section>

    <section className="card" style={{marginTop:14}}>
      <h2>{venue} {raceNo}R 出走表</h2>
      <table><thead><tr><th>枠</th><th>選手</th><th>級</th><th>全国</th><th>当地</th><th>ST</th><th>モーター</th><th>ボート</th><th>展示</th></tr></thead>
      <tbody>{racers.map(r=><tr key={r.frame}><td>{r.frame}</td><td>{r.name}</td><td>{r.grade}</td><td>{r.national}</td><td>{r.local}</td><td>{r.st}</td><td>{r.motor}%</td><td>{r.boat}%</td><td>{r.exhibition}</td></tr>)}</tbody></table>
      <div className="small">※現在はダミーデータ。次段階で公式/有料データ連携に差し替え。</div>
    </section>

    <section className="grid g2" style={{marginTop:14}}>
      <div className="card">
        <h2>AI確率ランキング</h2>
        <table><thead><tr><th>順位</th><th>艇</th><th>選手</th><th>スコア</th><th>1着率</th><th>3連対</th></tr></thead>
        <tbody>{ranked.map((r,i)=><tr key={r.frame}><td className={i===0?'rank1':''}>{i+1}</td><td>{r.frame}</td><td>{r.name}</td><td>{r.score}</td><td>{(r.winProb*100).toFixed(1)}%</td><td>{(r.top3Prob*100).toFixed(1)}%</td></tr>)}</tbody></table>
      </div>
      <div className={'card '+decision.className}>
        <h2>AI判定</h2>
        <div className="score">{decision.label}</div>
        <p>{decision.text}</p>
        <div className="small">目的：的中率ではなく回収率。期待値120以上を優先。</div>
      </div>
    </section>

    <section className="card" style={{marginTop:14}}>
      <h2>3連単 期待値ランキング</h2>
      <table><thead><tr><th>順位</th><th>買い目</th><th>的中確率</th><th>想定オッズ</th><th>期待値</th><th>判定</th></tr></thead>
      <tbody>{bets.map((b,i)=><tr key={b.bet}><td>{i+1}</td><td className={i===0?'rank1':''}>{b.bet}</td><td>{(b.prob*100).toFixed(2)}%</td><td>{b.odds}</td><td>{b.ev.toFixed(0)}</td><td>{b.ev>=120?<span className="ok">買い候補</span>:b.ev>=100?<span className="warn">注意</span>:<span className="danger">買わない</span>}</td></tr>)}</tbody></table>
    </section>

    <section className="grid g2" style={{marginTop:14}}>
      <div className="card">
        <h2>結果反映</h2>
        <div className="grid g2">
          <label>確定3連単<input placeholder="例 1-3-2" value={result} onChange={e=>setResult(e.target.value)}/></label>
          <label>投資額<input type="number" value={stake} onChange={e=>setStake(Number(e.target.value))}/></label>
        </div>
        <button className="btn primary" style={{marginTop:12,width:'100%'}} onClick={saveResult}>結果を保存</button>
      </div>
      <div className="card">
        <h2>成績</h2>
        <div className="grid g3">
          <div><div className="small">レース数</div><div className="score">{stats.count}</div></div>
          <div><div className="small">的中率</div><div className="score">{stats.count?Math.round(stats.hit/stats.count*100):0}%</div></div>
          <div><div className="small">回収率</div><div className="score">{roi}%</div></div>
        </div>
      </div>
    </section>

    <section className="card" style={{marginTop:14}}>
      <h2>保存履歴</h2>
      <table><thead><tr><th>日時</th><th>場</th><th>R</th><th>予想本命</th><th>結果</th><th>的中</th><th>収支</th></tr></thead>
      <tbody>{history.map((h,i)=><tr key={i}><td>{h.date}</td><td>{h.venue}</td><td>{h.raceNo}R</td><td>{h.topBet}</td><td>{h.result}</td><td>{h.hit?'○':'×'}</td><td className={h.profit>=0?'ok':'danger'}>{h.profit}</td></tr>)}</tbody></table>
    </section>
  </main>;
}
