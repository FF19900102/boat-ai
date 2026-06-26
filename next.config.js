'use client';

import { useMemo, useState } from 'react';
import { calcPredictions, defaultRacers, makeTickets, Racer } from '@/lib/boatAi';

const venues = ['桐生','戸田','江戸川','平和島','多摩川','浜名湖','蒲郡','常滑','津','三国','びわこ','住之江','尼崎','鳴門','丸亀','児島','宮島','徳山','下関','若松','芦屋','福岡','唐津','大村'];
const races = Array.from({ length: 12 }, (_, i) => i + 1);
const quickOdds = ['1-2-3','1-3-2','1-2-4','1-4-2','2-1-3','3-1-2','4-1-2','1-3-4','2-3-1','3-2-1'];

export default function BoatApp() {
  const [venue, setVenue] = useState('浜名湖');
  const [raceNo, setRaceNo] = useState(1);
  const [wind, setWind] = useState(2);
  const [wave, setWave] = useState(2);
  const [racers, setRacers] = useState<Racer[]>(defaultRacers());

  const preds = useMemo(() => calcPredictions(racers, { wind, wave }), [racers, wind, wave]);
  const tickets = useMemo(() => makeTickets(preds), [preds]);
  const buyTickets = tickets.filter((t) => t.ev >= 120).slice(0, 8);

  const updateRacer = (idx: number, key: keyof Racer, value: string) => {
    setRacers((prev) => prev.map((r, i) => i === idx ? { ...r, [key]: key === 'name' || key === 'className' ? value : Number(value) } : r));
  };
  const updateOdds = (ticket: string, value: string) => {
    setRacers((prev) => prev.map((r) => r.frame === Number(ticket.split('-')[0]) ? { ...r, odds: { ...r.odds, [ticket]: Number(value) } } : r));
  };

  return <main className="wrap">
    <div className="header">
      <div><div className="title">Boat AI</div><div className="sub">確率・期待値・見送り判定 v0.4</div></div>
      <div className="pill">{venue} {raceNo}R</div>
    </div>

    <section className="card">
      <h2>本日開催場</h2>
      <div className="row">{venues.map(v => <button key={v} className={`btn venue ${venue===v?'active':''}`} onClick={() => setVenue(v)}>{v}</button>)}</div>
    </section>

    <div style={{height:14}} />
    <section className="card">
      <h2>レース選択</h2>
      <div className="row">{races.map(r => <button key={r} className={`btn race ${raceNo===r?'active':''}`} onClick={() => setRaceNo(r)}>{r}R</button>)}</div>
    </section>

    <div style={{height:14}} />
    <div className="grid grid2">
      <section className="card">
        <h2>気象</h2>
        <div className="grid grid2">
          <label>風速<input type="number" value={wind} onChange={e=>setWind(Number(e.target.value))}/></label>
          <label>波高<input type="number" value={wave} onChange={e=>setWave(Number(e.target.value))}/></label>
        </div>
      </section>
      <section className={`card ${buyTickets.length ? 'buy' : 'skip'}`}>
        <h2>AI判定</h2>
        <div className="big">{buyTickets.length ? '買い候補あり' : '見送り推奨'}</div>
        <div className="sub">期待値120以上：{buyTickets.length}点</div>
      </section>
    </div>

    <div style={{height:14}} />
    <section className="card">
      <h2>出走表入力</h2>
      <div className="tableWrap"><table><thead><tr><th>枠</th><th>選手</th><th>級</th><th>全国</th><th>当地</th><th>ST</th><th>モーター</th><th>ボート</th><th>展示</th><th>体重</th></tr></thead><tbody>
        {racers.map((r, i) => <tr key={r.frame}>
          <td>{r.frame}</td>
          <td><input value={r.name} onChange={e=>updateRacer(i,'name',e.target.value)} /></td>
          <td><input value={r.className} onChange={e=>updateRacer(i,'className',e.target.value)} /></td>
          <td><input type="number" step="0.01" value={r.nationalWin} onChange={e=>updateRacer(i,'nationalWin',e.target.value)} /></td>
          <td><input type="number" step="0.01" value={r.localWin} onChange={e=>updateRacer(i,'localWin',e.target.value)} /></td>
          <td><input type="number" step="0.01" value={r.avgSt} onChange={e=>updateRacer(i,'avgSt',e.target.value)} /></td>
          <td><input type="number" step="0.1" value={r.motorRate} onChange={e=>updateRacer(i,'motorRate',e.target.value)} /></td>
          <td><input type="number" step="0.1" value={r.boatRate} onChange={e=>updateRacer(i,'boatRate',e.target.value)} /></td>
          <td><input type="number" step="0.01" value={r.exhibition} onChange={e=>updateRacer(i,'exhibition',e.target.value)} /></td>
          <td><input type="number" step="0.1" value={r.weight} onChange={e=>updateRacer(i,'weight',e.target.value)} /></td>
        </tr>)}
      </tbody></table></div>
    </section>

    <div style={{height:14}} />
    <div className="grid grid2">
      <section className="card">
        <h2>各艇 確率ランキング</h2>
        <div className="tableWrap"><table><thead><tr><th>順位</th><th>艇</th><th>選手</th><th>スコア</th><th>1着率</th><th>2連率</th><th>3連率</th></tr></thead><tbody>
          {preds.map((p, i) => <tr key={p.frame}><td className="rank">{i+1}</td><td>{p.frame}</td><td>{p.name}</td><td>{p.score.toFixed(1)}</td><td>{(p.winProb*100).toFixed(1)}%</td><td>{(p.top2Prob*100).toFixed(1)}%</td><td>{(p.top3Prob*100).toFixed(1)}%</td></tr>)}
        </tbody></table></div>
      </section>
      <section className="card">
        <h2>主要オッズ入力</h2>
        <div className="grid grid2">{quickOdds.map(k => <label key={k}>{k}<input type="number" step="0.1" placeholder="オッズ" onChange={e=>updateOdds(k,e.target.value)} /></label>)}</div>
      </section>
    </div>

    <div style={{height:14}} />
    <section className="card">
      <h2>3連単 期待値ランキング</h2>
      <div className="tableWrap"><table><thead><tr><th>順位</th><th>買い目</th><th>的中確率</th><th>オッズ</th><th>期待値</th><th>判定</th></tr></thead><tbody>
        {tickets.slice(0, 30).map((t, i) => <tr key={t.key}><td>{i+1}</td><td><b>{t.key}</b></td><td>{(t.prob*100).toFixed(2)}%</td><td>{t.odds || '-'}</td><td className={t.ev>=120?'good':t.ev>=100?'warn':'bad'}>{t.ev ? t.ev.toFixed(1) : '-'}</td><td>{t.judge}</td></tr>)}
      </tbody></table></div>
    </section>
  </main>;
}
