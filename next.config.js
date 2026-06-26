'use client';

import { useEffect, useMemo, useState } from 'react';
import { defaultRacers, makeTrifecta, probabilities, Racer, venues } from '../lib/boat';

type SavedRace = {
  id: string;
  date: string;
  venue: string;
  raceNo: number;
  racers: Racer[];
  topBet: string;
  topEv: number;
  resultCombo: string;
  payout: number;
  stake: number;
  hit: boolean;
  profit: number;
};

type Result = { combo: string; payout: number; stake: number };
const STORAGE_KEY = 'boat-ai-race-history-v1';

export default function BoatApp() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [venue, setVenue] = useState('浜名湖');
  const [raceNo, setRaceNo] = useState(1);
  const [racers, setRacers] = useState<Racer[]>(defaultRacers());
  const [result, setResult] = useState<Result>({ combo: '', payout: 0, stake: 1000 });
  const [history, setHistory] = useState<SavedRace[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  }, []);

  function saveHistory(next: SavedRace[]) {
    setHistory(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  const ranked = useMemo(() => probabilities(racers).sort((a, b) => b.win - a.win), [racers]);
  const bets = useMemo(() => makeTrifecta(racers).slice(0, 30), [racers]);
  const hit = result.combo ? bets.some(b => b.combo === normalizeCombo(result.combo)) : false;
  const profit = result.combo ? result.payout - result.stake : 0;
  const topBet = bets[0];

  const stats = useMemo(() => {
    const total = history.length;
    const stake = history.reduce((s, r) => s + r.stake, 0);
    const payout = history.reduce((s, r) => s + r.payout, 0);
    const hitCount = history.filter(r => r.hit).length;
    const profit = payout - stake;
    const roi = stake ? (payout / stake) * 100 : 0;
    const byVenue = venues.map(v => {
      const rows = history.filter(r => r.venue === v);
      const st = rows.reduce((s, r) => s + r.stake, 0);
      const pay = rows.reduce((s, r) => s + r.payout, 0);
      return { venue: v, count: rows.length, hit: rows.filter(r => r.hit).length, roi: st ? pay / st * 100 : 0, profit: pay - st };
    }).filter(r => r.count > 0).sort((a,b)=>b.roi-a.roi);
    return { total, stake, payout, hitCount, profit, roi, byVenue };
  }, [history]);

  function updateRacer(i: number, key: keyof Racer, value: string) {
    setRacers(prev => prev.map((r, idx) => idx === i ? { ...r, [key]: key === 'name' ? value : Number(value) } : r));
  }

  function resetRace() {
    setRacers(defaultRacers());
    setResult({ combo: '', payout: 0, stake: 1000 });
  }

  function saveRace() {
    const row: SavedRace = {
      id: `${Date.now()}`,
      date,
      venue,
      raceNo,
      racers,
      topBet: topBet?.combo ?? '',
      topEv: topBet?.ev ?? 0,
      resultCombo: normalizeCombo(result.combo),
      payout: Number(result.payout || 0),
      stake: Number(result.stake || 0),
      hit,
      profit,
    };
    saveHistory([row, ...history]);
  }

  function deleteRow(id: string) {
    saveHistory(history.filter(r => r.id !== id));
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
      <div className="grid small">
        <label>日付<input type="date" value={date} onChange={e=>setDate(e.target.value)} /></label>
        <label>レース<select value={raceNo} onChange={e=>setRaceNo(Number(e.target.value))}>{Array.from({length:12},(_,i)=>i+1).map(n=><option key={n} value={n}>{n}R</option>)}</select></label>
      </div>
      <div className="row mt">{Array.from({length:12},(_,i)=>i+1).map(n=><button key={n} className={n===raceNo?'btn':'btn gray'} onClick={()=>setRaceNo(n)}>{n}R</button>)}</div>
    </section>

    <section className="card section">
      <div className="row between"><h2 className="title">{venue} {raceNo}R 出走表入力</h2><button className="btn gray" onClick={resetRace}>入力リセット</button></div>
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
        <h2 className="title">期待値ランキング TOP30</h2>
        <table className="table"><thead><tr><th>買い目</th><th>確率</th><th>推定オッズ</th><th>期待値</th><th>判定</th></tr></thead><tbody>
          {bets.map(b=><tr key={b.combo}><td>{b.combo}</td><td>{(b.probability*100).toFixed(2)}%</td><td>{b.odds.toFixed(1)}</td><td>{b.ev.toFixed(0)}</td><td><span className={b.ev>=120?'pill good':b.ev>=100?'pill warn':'pill bad'}>{b.judge}</span></td></tr>)}
        </tbody></table>
      </section>
    </div>

    <section className="card section">
      <h2 className="title">結果入力・保存</h2>
      <div className="grid">
        <label>確定3連単<input placeholder="例 1-2-3" value={result.combo} onChange={e=>setResult({...result, combo:e.target.value})}/></label>
        <label>払戻金<input type="number" value={result.payout} onChange={e=>setResult({...result, payout:Number(e.target.value)})}/></label>
        <label>投資額<input type="number" value={result.stake} onChange={e=>setResult({...result, stake:Number(e.target.value)})}/></label>
      </div>
      <p><span className={hit?'pill good':'pill bad'}>{result.combo ? (hit ? '推奨内的中' : '推奨外') : '結果待ち'}</span>　収支：{result.combo ? `${profit.toLocaleString()}円` : '-'}</p>
      <button className="btn green" onClick={saveRace}>このレースを保存</button>
    </section>

    <section className="card section">
      <h2 className="title">成績ダッシュボード</h2>
      <div className="grid">
        <Kpi label="保存レース" value={`${stats.total}R`} />
        <Kpi label="的中率" value={stats.total ? `${(stats.hitCount / stats.total * 100).toFixed(1)}%` : '-'} />
        <Kpi label="回収率" value={stats.stake ? `${stats.roi.toFixed(1)}%` : '-'} />
        <Kpi label="総収支" value={`${stats.profit.toLocaleString()}円`} />
      </div>
    </section>

    <div className="cols section">
      <section className="card">
        <h2 className="title">競艇場別成績</h2>
        <table className="table"><thead><tr><th>場</th><th>R数</th><th>的中</th><th>回収率</th><th>収支</th></tr></thead><tbody>
          {stats.byVenue.map(v=><tr key={v.venue}><td>{v.venue}</td><td>{v.count}</td><td>{v.hit}</td><td>{v.roi.toFixed(1)}%</td><td>{v.profit.toLocaleString()}円</td></tr>)}
        </tbody></table>
      </section>
      <section className="card">
        <h2 className="title">保存履歴</h2>
        <table className="table"><thead><tr><th>日付</th><th>場</th><th>R</th><th>推奨</th><th>結果</th><th>収支</th><th></th></tr></thead><tbody>
          {history.slice(0,20).map(h=><tr key={h.id}><td>{h.date}</td><td>{h.venue}</td><td>{h.raceNo}R</td><td>{h.topBet}<br/>EV {h.topEv.toFixed(0)}</td><td>{h.resultCombo}<br/>{h.hit?'的中':'外れ'}</td><td>{h.profit.toLocaleString()}円</td><td><button className="mini" onClick={()=>deleteRow(h.id)}>削除</button></td></tr>)}
        </tbody></table>
      </section>
    </div>
  </main>;
}

function Kpi({ label, value }: { label: string; value: string }) {
  return <div className="kpi"><div>{label}</div><strong>{value}</strong></div>;
}

function normalizeCombo(s: string) {
  return s.replace(/[ー－―]/g, '-').replace(/\s/g, '');
}
