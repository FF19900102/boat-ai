'use client';

import { useMemo, useState } from 'react';
import { defaultRacers, makeTrifecta, probabilities, Racer, venues } from '../lib/boat';

type Result = { combo: string; payout: number; stake: number };

export default function BoatApp() {
  const [venue, setVenue] = useState('浜名湖');
  const [raceNo, setRaceNo] = useState(1);
  const [racers, setRacers] = useState<Racer[]>(defaultRacers());
  const [result, setResult] = useState<Result>({ combo: '', payout: 0, stake: 1000 });
  const ranked = useMemo(() => probabilities(racers).sort((a, b) => b.win - a.win), [racers]);
  const bets = useMemo(() => makeTrifecta(racers).slice(0, 20), [racers]);
  const hit = result.combo ? bets.some(b => b.combo === result.combo) : false;
  const profit = result.combo ? result.payout - result.stake : 0;

  function updateRacer(i: number, key: keyof Racer, value: string) {
    setRacers(prev => prev.map((r, idx) => idx === i ? { ...r, [key]: key === 'name' ? value : Number(value) } : r));
  }

  return <main className="wrap">
    <header className="header">
      <h1>Boat AI</h1>
      <p>確率・期待値・結果検証で見る競艇AI分析</p>
    </header>

    <section className="card">
      <h2 className="title">本日開催場</h2>
      <div className="grid">{venues.map(v => <button key={v} className={v===venue?'btn green':'btn gray'} onClick={()=>setVenue(v)}>{v}</button>)}</div>
    </section>

    <section className="card section">
      <h2 className="title">レース選択</h2>
      <div className="row">{Array.from({length:12},(_,i)=>i+1).map(n=><button key={n} className={n===raceNo?'btn':'btn gray'} onClick={()=>setRaceNo(n)}>{n}R</button>)}</div>
    </section>

    <section className="card section">
      <h2 className="title">{venue} {raceNo}R 出走表入力</h2>
      <table className="table"><thead><tr><th>艇</th><th>選手</th><th>全国</th><th>当地</th><th>ST</th><th>モーター</th><th>ボート</th><th>展示</th></tr></thead><tbody>
        {racers.map((r,i)=><tr key={r.frame}><td>{r.frame}</td><td><input value={r.name} onChange={e=>updateRacer(i,'name',e.target.value)} /></td><td><input type="number" step="0.01" value={r.nationalRate} onChange={e=>updateRacer(i,'nationalRate',e.target.value)} /></td><td><input type="number" step="0.01" value={r.localRate} onChange={e=>updateRacer(i,'localRate',e.target.value)} /></td><td><input type="number" step="0.01" value={r.st} onChange={e=>updateRacer(i,'st',e.target.value)} /></td><td><input type="number" step="0.1" value={r.motorRate} onChange={e=>updateRacer(i,'motorRate',e.target.value)} /></td><td><input type="number" step="0.1" value={r.boatRate} onChange={e=>updateRacer(i,'boatRate',e.target.value)} /></td><td><input type="number" step="0.01" value={r.exhibition} onChange={e=>updateRacer(i,'exhibition',e.target.value)} /></td></tr>)}
      </tbody></table>
    </section>

    <div className="cols section">
      <section className="card">
        <h2 className="title">AI確率ランキング</h2>
        <table className="table"><thead><tr><th>順位</th><th>艇</th><th>選手</th><th>1着率</th><th>評価</th></tr></thead><tbody>
          {ranked.map((r,i)=><tr key={r.frame}><td>{i+1}</td><td>{r.frame}</td><td>{r.name}</td><td>{(r.win*100).toFixed(1)}%</td><td><span className={i===0?'pill good':i<3?'pill':'pill warn'}>{i===0?'本命':i<3?'相手':'穴'}</span></td></tr>)}
        </tbody></table>
      </section>

      <section className="card">
        <h2 className="title">期待値ランキング TOP20</h2>
        <table className="table"><thead><tr><th>買い目</th><th>確率</th><th>推定オッズ</th><th>期待値</th><th>判定</th></tr></thead><tbody>
          {bets.map(b=><tr key={b.combo}><td>{b.combo}</td><td>{(b.probability*100).toFixed(2)}%</td><td>{b.odds.toFixed(1)}</td><td>{b.ev.toFixed(0)}</td><td><span className={b.ev>=120?'pill good':b.ev>=100?'pill warn':'pill bad'}>{b.judge}</span></td></tr>)}
        </tbody></table>
      </section>
    </div>

    <section className="card section">
      <h2 className="title">結果入力・検証</h2>
      <div className="grid">
        <label>確定3連単<input placeholder="例 1-2-3" value={result.combo} onChange={e=>setResult({...result, combo:e.target.value})}/></label>
        <label>払戻金<input type="number" value={result.payout} onChange={e=>setResult({...result, payout:Number(e.target.value)})}/></label>
        <label>投資額<input type="number" value={result.stake} onChange={e=>setResult({...result, stake:Number(e.target.value)})}/></label>
      </div>
      <p><span className={hit?'pill good':'pill bad'}>{result.combo ? (hit ? '推奨内的中' : '推奨外') : '結果待ち'}</span>　収支：{result.combo ? `${profit.toLocaleString()}円` : '-'}</p>
    </section>
  </main>;
}
