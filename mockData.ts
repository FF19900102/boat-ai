'use client';

import { useMemo, useState } from 'react';
import { venues, defaultBoats } from '@/lib/mockData';
import { Boat, ResultRecord, Weather } from '@/lib/types';
import { buildTrifectas, calculatePredictions, modelScores } from '@/lib/ai';

const today = new Date().toISOString().slice(0,10);

function loadResults(): ResultRecord[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem('boat-ai-results') || '[]'); } catch { return []; }
}
function saveResults(items: ResultRecord[]) {
  localStorage.setItem('boat-ai-results', JSON.stringify(items));
}

export default function Home() {
  const [selectedVenue, setSelectedVenue] = useState(venues.find(v => v.id === 'hamanako') || venues[0]);
  const [raceNo, setRaceNo] = useState(1);
  const [boats, setBoats] = useState<Boat[]>(defaultBoats());
  const [weather, setWeather] = useState<Weather>({ weather: '晴れ', windDirection: '向かい風', windSpeed: 2, wave: 2 });
  const [odds, setOdds] = useState<Record<string, number>>({});
  const [bought, setBought] = useState('1-2-3');
  const [stake, setStake] = useState(1000);
  const [result, setResult] = useState('1-2-3');
  const [payout, setPayout] = useState(0);
  const [records, setRecords] = useState<ResultRecord[]>([]);

  const predictions = useMemo(() => calculatePredictions(boats, weather), [boats, weather]);
  const trifectas = useMemo(() => buildTrifectas(predictions, odds), [predictions, odds]);
  const topPicks = trifectas.slice(0, 12);
  const buyCandidates = topPicks.filter(x => x.decision === '買い候補');
  const dashRecords = records.length ? records : (typeof window !== 'undefined' ? loadResults() : []);
  const totalStake = dashRecords.reduce((s, r) => s + r.stake, 0);
  const totalPayout = dashRecords.reduce((s, r) => s + r.payout, 0);
  const hitCount = dashRecords.filter(r => r.hit).length;
  const roi = totalStake ? Math.round(totalPayout / totalStake * 100) : 0;

  function updateBoat(index: number, key: keyof Boat, value: string) {
    setBoats(prev => prev.map((b, i) => i === index ? { ...b, [key]: key === 'racer' || key === 'className' ? value : Number(value) } : b));
  }
  function registerResult() {
    const hit = bought.trim() === result.trim();
    const item: ResultRecord = {
      id: crypto.randomUUID(), date: today, venue: selectedVenue.name, raceNo, result, bought, stake, payout: hit ? payout : 0, hit, profit: (hit ? payout : 0) - stake, createdAt: new Date().toISOString()
    };
    const next = [item, ...loadResults()];
    saveResults(next);
    setRecords(next);
  }

  return (
    <main className="wrap">
      <header className="header">
        <div><h1>Boat AI</h1><p>確率・期待値・結果検証で競艇を分析</p></div>
        <div className="row"><span className="pill good">Bundle v0.5</span><span className="pill warn">自動取得は次工程</span></div>
      </header>

      <div className="notice">現在は手入力＋ローカル保存版です。公式データ自動取得、速報取得、DB、LightGBMはこの土台に追加します。</div>

      <section className="card">
        <div className="section-title">本日開催場</div>
        <div className="grid">
          {venues.map(v => <div key={v.id} className="card venue" onClick={() => setSelectedVenue(v)} style={{borderColor:selectedVenue.id===v.id?'#0f5bff':'#d8deea'}}>
            <div className="name">{v.name}</div><div className="small">{v.area} {v.night ? '・ナイター' : ''}</div>
          </div>)}
        </div>
      </section>

      <section className="card" style={{marginTop:14}}>
        <div className="row" style={{justifyContent:'space-between'}}><div className="section-title">レース選択：{selectedVenue.name}</div><button className="btn secondary" onClick={() => setBoats(defaultBoats())}>サンプル再読込</button></div>
        <div className="tabs">{Array.from({length:12},(_,i)=>i+1).map(n => <button key={n} className={`tab ${raceNo===n?'active':''}`} onClick={()=>setRaceNo(n)}>{n}R</button>)}</div>
      </section>

      <section className="card" style={{marginTop:14}}>
        <div className="section-title">気象</div>
        <div className="grid">
          <label>天候<select value={weather.weather} onChange={e=>setWeather({...weather, weather:e.target.value})}><option>晴れ</option><option>曇り</option><option>雨</option></select></label>
          <label>風向<select value={weather.windDirection} onChange={e=>setWeather({...weather, windDirection:e.target.value})}><option>向かい風</option><option>追い風</option><option>左横風</option><option>右横風</option><option>無風</option></select></label>
          <label>風速m<input type="number" value={weather.windSpeed} onChange={e=>setWeather({...weather, windSpeed:Number(e.target.value)})}/></label>
          <label>波高cm<input type="number" value={weather.wave} onChange={e=>setWeather({...weather, wave:Number(e.target.value)})}/></label>
        </div>
      </section>

      <section className="card" style={{marginTop:14, overflowX:'auto'}}>
        <div className="section-title">出走表入力</div>
        <table><thead><tr><th>枠</th><th>選手</th><th>級</th><th>全国</th><th>当地</th><th>ST</th><th>モーター</th><th>ボート</th><th>展示</th><th>体重</th></tr></thead><tbody>
          {boats.map((b,i)=><tr key={b.frame}><td>{b.frame}</td><td><input value={b.racer} onChange={e=>updateBoat(i,'racer',e.target.value)}/></td><td><select value={b.className} onChange={e=>updateBoat(i,'className',e.target.value)}><option>A1</option><option>A2</option><option>B1</option><option>B2</option></select></td><td><input type="number" step="0.1" value={b.nationalRate} onChange={e=>updateBoat(i,'nationalRate',e.target.value)}/></td><td><input type="number" step="0.1" value={b.localRate} onChange={e=>updateBoat(i,'localRate',e.target.value)}/></td><td><input type="number" step="0.01" value={b.avgSt} onChange={e=>updateBoat(i,'avgSt',e.target.value)}/></td><td><input type="number" value={b.motorRate} onChange={e=>updateBoat(i,'motorRate',e.target.value)}/></td><td><input type="number" value={b.boatRate} onChange={e=>updateBoat(i,'boatRate',e.target.value)}/></td><td><input type="number" step="0.01" value={b.exhibition} onChange={e=>updateBoat(i,'exhibition',e.target.value)}/></td><td><input type="number" value={b.weight} onChange={e=>updateBoat(i,'weight',e.target.value)}/></td></tr>)}
        </tbody></table>
      </section>

      <section className="card" style={{marginTop:14}}>
        <div className="section-title">AI確率</div>
        <div className="rank">{predictions.map(p=><div className="rankItem" key={p.frame}><b>{p.frame}号艇</b><div><div>{p.racer}</div><div className="bar"><span style={{width:`${p.win}%`}}/></div></div><div>1着 {p.win}%</div><div>2連 {p.top2}%</div><div>3連 {p.top3}%</div></div>)}</div>
      </section>

      <section className="card" style={{marginTop:14, overflowX:'auto'}}>
        <div className="row" style={{justifyContent:'space-between'}}><div className="section-title">期待値ランキング</div><span className={buyCandidates.length ? 'pill good':'pill bad'}>{buyCandidates.length ? '買い候補あり':'見送り推奨'}</span></div>
        <table><thead><tr><th>順位</th><th>買い目</th><th>的中確率</th><th>オッズ</th><th>期待値</th><th>判定</th></tr></thead><tbody>
          {topPicks.map((t,i)=><tr key={t.combo}><td>{i+1}</td><td><b>{t.combo}</b></td><td>{t.probability}%</td><td><input type="number" step="0.1" value={t.odds} onChange={e=>setOdds({...odds,[t.combo]:Number(e.target.value)})}/></td><td>{t.ev}</td><td><span className={`pill ${t.decision==='買い候補'?'good':t.decision==='注意'?'warn':'bad'}`}>{t.decision}</span></td></tr>)}
        </tbody></table>
      </section>

      <section className="card" style={{marginTop:14}}>
        <div className="section-title">結果入力・保存</div>
        <div className="grid">
          <label>購入買い目<input value={bought} onChange={e=>setBought(e.target.value)} placeholder="1-2-3"/></label>
          <label>投資額<input type="number" value={stake} onChange={e=>setStake(Number(e.target.value))}/></label>
          <label>確定結果<input value={result} onChange={e=>setResult(e.target.value)} placeholder="1-2-3"/></label>
          <label>払戻金<input type="number" value={payout} onChange={e=>setPayout(Number(e.target.value))}/></label>
        </div>
        <button className="btn good" style={{marginTop:12}} onClick={registerResult}>結果を保存</button>
      </section>

      <section className="card" style={{marginTop:14}}>
        <div className="section-title">成績ダッシュボード</div>
        <div className="summary">
          <div className="metric"><span>総投資</span><b>{totalStake.toLocaleString()}円</b></div>
          <div className="metric"><span>総払戻</span><b>{totalPayout.toLocaleString()}円</b></div>
          <div className="metric"><span>回収率</span><b>{roi}%</b></div>
          <div className="metric"><span>的中率</span><b>{dashRecords.length ? Math.round(hitCount/dashRecords.length*100) : 0}%</b></div>
        </div>
      </section>

      <section className="card" style={{marginTop:14}}>
        <div className="section-title">AIリーグ</div>
        <div className="grid">{modelScores().map(m=><div className="metric" key={m.name}><span>{m.name}</span><b>{m.roi}%</b><div className="small">的中率 {m.hit}%</div></div>)}</div>
      </section>

      <p className="footerNote">次は公式データ取得API、結果速報、DB接続を追加します。</p>
    </main>
  );
}
