'use client';

import { useEffect, useMemo, useState } from 'react';
import { generateTrifecta, predictBoats, verdict } from '../lib/ai';
import { createDefaultBoats, venues } from '../lib/sampleData';
import { Boat, SavedResult, Weather } from '../lib/types';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function Page() {
  const [date, setDate] = useState(today());
  const [venueId, setVenueId] = useState('hamanako');
  const [raceNo, setRaceNo] = useState(1);
  const [boats, setBoats] = useState<Boat[]>(createDefaultBoats());
  const [weather, setWeather] = useState<Weather>({ weather: '晴', windDir: '北西', windSpeed: 2, wave: 2 });
  const [result, setResult] = useState('1-2-3');
  const [investment, setInvestment] = useState(1000);
  const [payout, setPayout] = useState(0);
  const [saved, setSaved] = useState<SavedResult[]>([]);
  const [oddsMap, setOddsMap] = useState<Record<string, number>>({});

  const venue = venues.find((v) => v.id === venueId) ?? venues[0];
  const predictions = useMemo(() => predictBoats(boats, weather), [boats, weather]);
  const trifecta = useMemo(() => {
    return generateTrifecta(predictions)
      .map((r) => {
        const odds = oddsMap[r.key] ?? r.odds;
        const ev = Math.round((r.probability / 100) * odds * 100);
        return { ...r, odds, ev, rank: ev >= 120 ? '買い候補' : ev >= 100 ? '注意' : '見送り' };
      })
      .sort((a, b) => b.ev - a.ev);
  }, [predictions, oddsMap]);
  const topRows = trifecta.slice(0, 20);
  const v = verdict(trifecta);
  const hit = topRows.some((r) => r.key === result);
  const profit = payout - investment;
  const totalInvestment = saved.reduce((sum, r) => sum + r.investment, 0);
  const totalPayout = saved.reduce((sum, r) => sum + r.payout, 0);
  const roi = totalInvestment ? Math.round((totalPayout / totalInvestment) * 1000) / 10 : 0;
  const hitRate = saved.length ? Math.round((saved.filter((x) => x.hit).length / saved.length) * 1000) / 10 : 0;

  useEffect(() => {
    const raw = localStorage.getItem('boat-ai-results');
    if (raw) setSaved(JSON.parse(raw));
    const oddsRaw = localStorage.getItem('boat-ai-odds');
    if (oddsRaw) setOddsMap(JSON.parse(oddsRaw));
  }, []);

  useEffect(() => { localStorage.setItem('boat-ai-results', JSON.stringify(saved)); }, [saved]);
  useEffect(() => { localStorage.setItem('boat-ai-odds', JSON.stringify(oddsMap)); }, [oddsMap]);

  function updateBoat(index: number, key: keyof Boat, value: string) {
    setBoats((prev) =>
      prev.map((b, i) =>
        i === index
          ? {
              ...b,
              [key]: key === 'name' || key === 'className' ? value : Number(value)
            }
          : b
      )
    );
  }

  function setManualOdds(key: string, value: number) {
    setOddsMap((prev) => ({ ...prev, [key]: value }));
  }

  function exportResults() {
    const blob = new Blob([JSON.stringify(saved, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'boat-ai-results.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function saveResult() {
    const row: SavedResult = {
      id: crypto.randomUUID(),
      date,
      venue: venue.name,
      raceNo,
      predictionTop: topRows[0]?.key ?? '',
      result,
      investment,
      payout,
      profit,
      hit
    };
    setSaved((prev) => [row, ...prev]);
  }

  return (
    <main className="page">
      <header className="header">
        <div>
          <div className="logo">Boat AI</div>
          <div className="sub">確率・期待値・結果検証で競艇を分析</div>
        </div>
        <div className="row">
          <input style={{ width: 160 }} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <button className="btn secondary" onClick={() => setBoats(createDefaultBoats())}>初期化</button>
        </div>
      </header>

      <section className="grid grid2">
        <div className="card">
          <div className="title">本日開催場</div>
          <div className="grid grid3">
            {venues.map((x) => (
              <button key={x.id} className={`venue ${venueId === x.id ? 'active' : ''}`} onClick={() => setVenueId(x.id)}>
                <b>{x.name}</b>
                <div className="small">{x.region}{x.night ? '・ナイター' : ''}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="title">レース選択</div>
          <div className="row" style={{ marginBottom: 14 }}>
            <span className="badge buy">{venue.name}</span>
            <span className="small">{date}</span>
          </div>
          <div className="grid grid3">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <button key={n} className={`raceButton ${raceNo === n ? 'active' : ''}`} onClick={() => setRaceNo(n)}>{n}R</button>
            ))}
          </div>
        </div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="title">出走表入力</div>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>枠</th><th>選手</th><th>級</th><th>全国</th><th>当地</th><th>ST</th><th>モーター%</th><th>ボート%</th><th>展示</th><th>チルト</th><th>体重</th><th>進入</th>
              </tr>
            </thead>
            <tbody>
              {boats.map((b, i) => (
                <tr key={b.frame}>
                  <td>{b.frame}</td>
                  <td><input value={b.name} onChange={(e) => updateBoat(i, 'name', e.target.value)} /></td>
                  <td><input value={b.className} onChange={(e) => updateBoat(i, 'className', e.target.value)} /></td>
                  <td><input type="number" step="0.01" value={b.nationalRate} onChange={(e) => updateBoat(i, 'nationalRate', e.target.value)} /></td>
                  <td><input type="number" step="0.01" value={b.localRate} onChange={(e) => updateBoat(i, 'localRate', e.target.value)} /></td>
                  <td><input type="number" step="0.01" value={b.avgSt} onChange={(e) => updateBoat(i, 'avgSt', e.target.value)} /></td>
                  <td><input type="number" step="0.1" value={b.motorRate} onChange={(e) => updateBoat(i, 'motorRate', e.target.value)} /></td>
                  <td><input type="number" step="0.1" value={b.boatRate} onChange={(e) => updateBoat(i, 'boatRate', e.target.value)} /></td>
                  <td><input type="number" step="0.01" value={b.exhibition} onChange={(e) => updateBoat(i, 'exhibition', e.target.value)} /></td>
                  <td><input type="number" step="0.5" value={b.tilt} onChange={(e) => updateBoat(i, 'tilt', e.target.value)} /></td>
                  <td><input type="number" step="0.1" value={b.weight} onChange={(e) => updateBoat(i, 'weight', e.target.value)} /></td>
                  <td><input type="number" value={b.course} onChange={(e) => updateBoat(i, 'course', e.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid3" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="title">気象</div>
          <div className="grid">
            <input value={weather.weather} onChange={(e) => setWeather({ ...weather, weather: e.target.value })} placeholder="天候" />
            <input value={weather.windDir} onChange={(e) => setWeather({ ...weather, windDir: e.target.value })} placeholder="風向" />
            <input type="number" value={weather.windSpeed} onChange={(e) => setWeather({ ...weather, windSpeed: Number(e.target.value) })} placeholder="風速" />
            <input type="number" value={weather.wave} onChange={(e) => setWeather({ ...weather, wave: Number(e.target.value) })} placeholder="波高" />
          </div>
        </div>
        <div className="card">
          <div className="title">AI判定</div>
          <div className={`badge ${v.className}`}>{v.label}</div>
          <div className="small" style={{ marginTop: 12 }}>期待値120以上は買い候補。100未満は見送り。</div>
        </div>
        <div className="card">
          <div className="title">通算成績</div>
          <div className="kpi">回収率 {roi}%</div>
          <div className="small">的中率 {hitRate}% / 投資 {totalInvestment.toLocaleString()}円 / 回収 {totalPayout.toLocaleString()}円</div>
        </div>
      </section>

      <section className="grid grid2" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="title">各艇確率</div>
          <table>
            <thead><tr><th>艇</th><th>選手</th><th>スコア</th><th>1着</th><th>2連対</th><th>3連対</th></tr></thead>
            <tbody>
              {predictions.map((p) => (
                <tr key={p.frame}><td>{p.frame}</td><td>{p.name}</td><td>{p.score}</td><td>{p.winRate}%</td><td>{p.top2Rate}%</td><td>{p.top3Rate}%</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <div className="title">3連単 期待値ランキング</div>
          <table>
            <thead><tr><th>買い目</th><th>確率</th><th>オッズ</th><th>EV</th><th>判定</th></tr></thead>
            <tbody>
              {topRows.map((r) => (
                <tr key={r.key}><td><b>{r.key}</b></td><td>{r.probability}%</td><td><input type="number" step="0.1" value={r.odds} onChange={(e) => setManualOdds(r.key, Number(e.target.value))} /></td><td>{r.ev}</td><td><span className={`badge ${r.ev >= 120 ? 'buy' : r.ev >= 100 ? 'watch' : 'skip'}`}>{r.rank}</span></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid2" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="title">結果入力</div>
          <div className="grid">
            <input value={result} onChange={(e) => setResult(e.target.value)} placeholder="例 1-2-3" />
            <input type="number" value={investment} onChange={(e) => setInvestment(Number(e.target.value))} placeholder="投資額" />
            <input type="number" value={payout} onChange={(e) => setPayout(Number(e.target.value))} placeholder="払戻金" />
            <div className="row">
              <span className={`badge ${hit ? 'buy' : 'skip'}`}>{hit ? '的中' : '不的中'}</span>
              <span className="small">収支 {profit.toLocaleString()}円</span>
            </div>
            <button className="btn green" onClick={saveResult}>結果を保存</button>
            <button className="btn secondary" onClick={exportResults}>成績JSONを書き出し</button>
            <button className="btn red" onClick={() => setSaved([])}>履歴削除</button>
          </div>
        </div>
        <div className="card">
          <div className="title">保存履歴</div>
          <table>
            <thead><tr><th>日付</th><th>場</th><th>R</th><th>予想</th><th>結果</th><th>収支</th></tr></thead>
            <tbody>
              {saved.map((s) => (
                <tr key={s.id}><td>{s.date}</td><td>{s.venue}</td><td>{s.raceNo}R</td><td>{s.predictionTop}</td><td>{s.result}</td><td>{s.profit.toLocaleString()}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
