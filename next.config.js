'use client';

import { useMemo, useState, useEffect, ChangeEvent } from 'react';
import { Boat, RaceResult, defaultBoats, venues, calcPredictions, generateTickets, grade, summarize } from '@/lib/boat';

export default function BoatAIApp() {
  const today = new Date().toISOString().slice(0, 10);
  const [venue, setVenue] = useState('浜名湖');
  const [raceNo, setRaceNo] = useState(1);
  const [weather, setWeather] = useState({ wind: 2, wave: 2, condition: '晴れ' });
  const [boats, setBoats] = useState<Boat[]>(defaultBoats);
  const [oddsText, setOddsText] = useState('1-2-3 12.5\n1-3-2 15.8\n1-2-4 18.6\n1-4-2 29.4\n2-1-3 42.0\n3-1-2 48.5');
  const [buyText, setBuyText] = useState('');
  const [resultCombo, setResultCombo] = useState('');
  const [payout, setPayout] = useState(0);
  const [stake, setStake] = useState(1000);
  const [history, setHistory] = useState<RaceResult[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('boat-ai-results');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const oddsMap = useMemo(() => {
    const map: Record<string, number> = {};
    oddsText.split('\n').forEach((line) => {
      const [combo, odds] = line.trim().split(/\s+/);
      if (/^[1-6]-[1-6]-[1-6]$/.test(combo) && Number(odds) > 0) map[combo] = Number(odds);
    });
    return map;
  }, [oddsText]);

  const preds = useMemo(() => calcPredictions(boats, Number(weather.wind), Number(weather.wave)), [boats, weather]);
  const tickets = useMemo(() => generateTickets(preds, oddsMap), [preds, oddsMap]);
  const topTickets = tickets.slice(0, 20);
  const buyCandidates = tickets.filter((t) => t.ev >= 120).slice(0, 8);
  const best = tickets[0];

  function updateBoat(index: number, key: keyof Boat, value: string) {
    setBoats((prev) => prev.map((b, i) => i === index ? { ...b, [key]: key === 'racer' || key === 'className' ? value : Number(value) } : b));
  }

  function applyRecommendations() {
    const list = buyCandidates.length ? buyCandidates : topTickets.slice(0, 4);
    setBuyText(list.slice(0, 4).map((t) => t.combo).join('\n'));
  }

  function saveResult() {
    const boughtTickets = buyText.split(/\n|,/).map((s) => s.trim()).filter(Boolean);
    const hit = boughtTickets.includes(resultCombo);
    const returnAmount = hit ? payout : 0;
    const profit = returnAmount - stake;
    const row: RaceResult = {
      venue,
      raceNo,
      resultCombo,
      payout,
      stake,
      boughtTickets,
      hit,
      returnAmount,
      profit,
      bestEv: best?.ev || 0,
      bestCombo: best?.combo || '',
      createdAt: new Date().toISOString(),
    };
    const next = [row, ...history];
    setHistory(next);
    localStorage.setItem('boat-ai-results', JSON.stringify(next));
  }

  function exportHistory() {
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boat-ai-history-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importHistory(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = JSON.parse(String(reader.result)) as RaceResult[];
        setHistory(rows);
        localStorage.setItem('boat-ai-results', JSON.stringify(rows));
      } catch {
        alert('JSONの読み込みに失敗しました');
      }
    };
    reader.readAsText(file);
  }

  function clearHistory() {
    if (!confirm('履歴をすべて削除しますか？')) return;
    setHistory([]);
    localStorage.removeItem('boat-ai-results');
  }

  const totalStake = history.reduce((s, h) => s + h.stake, 0);
  const totalReturn = history.reduce((s, h) => s + h.returnAmount, 0);
  const totalProfit = totalReturn - totalStake;
  const hitRate = history.length ? (history.filter((h) => h.hit).length / history.length) * 100 : 0;
  const roi = totalStake ? (totalReturn / totalStake) * 100 : 0;
  const venueStats = summarize(history, 'venue');
  const raceStats = summarize(history, 'raceNo');

  return (
    <main className="wrap">
      <div className="header">
        <div>
          <div className="brand">Boat AI</div>
          <div className="sub">確率・期待値・結果検証</div>
        </div>
        <div className="actions"><button className="btn primary">{today}</button><button className="btn">v0.7</button></div>
      </div>

      <section className="grid g3">
        <div className="card">
          <h2 className="title">開催場</h2>
          <select value={venue} onChange={(e) => setVenue(e.target.value)}>{venues.map((v) => <option key={v}>{v}</option>)}</select>
        </div>
        <div className="card">
          <h2 className="title">レース</h2>
          <select value={raceNo} onChange={(e) => setRaceNo(Number(e.target.value))}>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}R</option>)}</select>
        </div>
        <div className="card">
          <h2 className="title">AI判定</h2>
          <div className="rank1">{best?.ev >= 120 ? '買い候補' : '見送り'}</div>
          <div className={best?.ev >= 120 ? 'goodText' : 'warnText'}>{best ? `${grade(best.ev)} EV ${best.ev.toFixed(1)}` : '-'}</div>
        </div>
      </section>

      <section className="card" style={{marginTop:14}}>
        <h2 className="title">出走表入力</h2>
        {boats.map((b, i) => (
          <div className="row" key={b.frame}>
            <div><label>枠</label><input value={b.frame} onChange={(e)=>updateBoat(i,'frame',e.target.value)} /></div>
            <div><label>選手名</label><input value={b.racer} onChange={(e)=>updateBoat(i,'racer',e.target.value)} /></div>
            <div><label>級</label><select value={b.className} onChange={(e)=>updateBoat(i,'className',e.target.value)}><option>A1</option><option>A2</option><option>B1</option><option>B2</option></select></div>
            <div><label>全国</label><input value={b.nationalWin} onChange={(e)=>updateBoat(i,'nationalWin',e.target.value)} /></div>
            <div><label>当地</label><input value={b.localWin} onChange={(e)=>updateBoat(i,'localWin',e.target.value)} /></div>
            <div><label>ST</label><input value={b.avgSt} onChange={(e)=>updateBoat(i,'avgSt',e.target.value)} /></div>
            <div><label>モーター%</label><input value={b.motorRate} onChange={(e)=>updateBoat(i,'motorRate',e.target.value)} /></div>
            <div><label>展示</label><input value={b.exhibition} onChange={(e)=>updateBoat(i,'exhibition',e.target.value)} /></div>
            <div><label>進入</label><input value={b.entry} onChange={(e)=>updateBoat(i,'entry',e.target.value)} /></div>
            <div><label>体重</label><input value={b.weight} onChange={(e)=>updateBoat(i,'weight',e.target.value)} /></div>
          </div>
        ))}
      </section>

      <section className="grid g3" style={{marginTop:14}}>
        <div className="card"><h2 className="title">気象</h2><div className="grid g3"><div><label>天候</label><input value={weather.condition} onChange={(e)=>setWeather({...weather,condition:e.target.value})}/></div><div><label>風速m</label><input value={weather.wind} onChange={(e)=>setWeather({...weather,wind:Number(e.target.value)})}/></div><div><label>波高cm</label><input value={weather.wave} onChange={(e)=>setWeather({...weather,wave:Number(e.target.value)})}/></div></div></div>
        <div className="card"><h2 className="title">オッズ入力</h2><TextareaLike value={oddsText} onChange={setOddsText} /></div>
        <div className="card"><h2 className="title">購入買い目</h2><div className="actions" style={{marginBottom:8}}><button className="btn good" onClick={applyRecommendations}>推奨を反映</button></div><TextareaLike value={buyText} onChange={setBuyText} /></div>
      </section>

      <section className="grid g2" style={{marginTop:14}}>
        <div className="card">
          <h2 className="title">各艇確率</h2>
          <table className="table"><thead><tr><th>艇</th><th>選手</th><th>1着</th><th>2連</th><th>3連</th><th>スコア</th></tr></thead><tbody>{preds.map((p)=><tr key={p.frame}><td>{p.frame}</td><td>{p.racer}</td><td className="goodText">{p.winProb.toFixed(1)}%</td><td>{p.top2Prob.toFixed(1)}%</td><td>{p.top3Prob.toFixed(1)}%</td><td>{p.score.toFixed(1)}</td></tr>)}</tbody></table>
        </div>
        <div className="card">
          <h2 className="title">期待値ランキング</h2>
          <div className="scroll"><table className="table"><thead><tr><th>買い目</th><th>確率</th><th>オッズ</th><th>EV</th><th>判定</th></tr></thead><tbody>{topTickets.map((t)=><tr key={t.combo}><td>{t.combo}</td><td>{t.prob.toFixed(2)}%</td><td>{t.odds || '-'}</td><td className={t.ev>=120?'goodText':t.ev>=100?'warnText':'muted'}>{t.ev.toFixed(1)}</td><td>{t.judge}</td></tr>)}</tbody></table></div>
        </div>
      </section>

      <section className="grid g2" style={{marginTop:14}}>
        <div className="card">
          <h2 className="title">結果入力</h2>
          <div className="grid g4">
            <div><label>確定3連単</label><input value={resultCombo} onChange={(e)=>setResultCombo(e.target.value)} placeholder="1-2-3" /></div>
            <div><label>払戻金</label><input value={payout} onChange={(e)=>setPayout(Number(e.target.value))} /></div>
            <div><label>投資額</label><input value={stake} onChange={(e)=>setStake(Number(e.target.value))} /></div>
            <div style={{alignSelf:'end'}}><button className="btn good" onClick={saveResult}>結果保存</button></div>
          </div>
        </div>
        <div className="card">
          <h2 className="title">成績</h2>
          <div className="grid g4">
            <div><div className="small">レース数</div><div className="stat">{history.length}</div></div>
            <div><div className="small">的中率</div><div className="stat">{hitRate.toFixed(1)}%</div></div>
            <div><div className="small">回収率</div><div className="stat">{roi.toFixed(1)}%</div></div>
            <div><div className="small">収支</div><div className={totalProfit>=0?'stat goodText':'stat badText'}>{totalProfit.toLocaleString()}円</div></div>
          </div>
        </div>
      </section>

      <section className="grid g2" style={{marginTop:14}}>
        <div className="card">
          <h2 className="title">競艇場別成績</h2>
          <MiniStats rows={venueStats} suffix="" />
        </div>
        <div className="card">
          <h2 className="title">レース番号別成績</h2>
          <MiniStats rows={raceStats} suffix="R" />
        </div>
      </section>

      <section className="card" style={{marginTop:14}}>
        <div className="header" style={{marginBottom:8}}>
          <h2 className="title" style={{margin:0}}>履歴</h2>
          <div className="actions">
            <button className="btn" onClick={exportHistory}>履歴出力</button>
            <label className="btn" style={{margin:0}}>履歴読込<input type="file" accept="application/json" onChange={importHistory} style={{display:'none'}} /></label>
            <button className="btn bad" onClick={clearHistory}>全削除</button>
          </div>
        </div>
        <table className="table"><thead><tr><th>日時</th><th>場</th><th>R</th><th>結果</th><th>的中</th><th>投資</th><th>払戻</th><th>収支</th><th>最高EV</th></tr></thead><tbody>{history.map((h,i)=><tr key={i}><td>{new Date(h.createdAt).toLocaleString('ja-JP')}</td><td>{h.venue}</td><td>{h.raceNo}R</td><td>{h.resultCombo}</td><td className={h.hit?'goodText':'badText'}>{h.hit?'的中':'不的中'}</td><td>{h.stake.toLocaleString()}</td><td>{h.returnAmount.toLocaleString()}</td><td className={h.profit>=0?'goodText':'badText'}>{h.profit.toLocaleString()}</td><td>{h.bestCombo} / {h.bestEv?.toFixed?.(1) ?? '-'}</td></tr>)}</tbody></table>
      </section>
    </main>
  );
}

function TextareaLike({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <textarea value={value} onChange={(e)=>onChange(e.target.value)} style={{width:'100%',minHeight:110,background:'#091129',border:'1px solid #2b3a68',borderRadius:10,color:'#eef3ff',padding:10}} />;
}

function MiniStats({ rows, suffix }: { rows: { name: string; races: number; hits: number; stake: number; ret: number; profit: number }[]; suffix: string }) {
  return <table className="table"><thead><tr><th>項目</th><th>数</th><th>的中率</th><th>回収率</th><th>収支</th></tr></thead><tbody>{rows.map((r)=><tr key={r.name}><td>{r.name}{suffix}</td><td>{r.races}</td><td>{r.races ? ((r.hits/r.races)*100).toFixed(1) : '0.0'}%</td><td>{r.stake ? ((r.ret/r.stake)*100).toFixed(1) : '0.0'}%</td><td className={r.profit>=0?'goodText':'badText'}>{r.profit.toLocaleString()}</td></tr>)}</tbody></table>;
}
