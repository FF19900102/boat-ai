'use client';

import { useEffect, useMemo, useState } from 'react';
import { venues, racers } from '../data/mockData';
import { addProbabilities, buildBetPlan, judgeEv, trifectaCombinations } from '../lib/prediction';

const STORAGE_KEY = 'boat-ai-results-v1';

export default function HomeApp() {
  const [screen, setScreen] = useState('venues');
  const [venue, setVenue] = useState(null);
  const [raceNo, setRaceNo] = useState(null);
  const [condition, setCondition] = useState({ wind: 3, wave: 2, weather: '晴' });
  const [oddsMap, setOddsMap] = useState({});
  const [unit, setUnit] = useState(100);
  const [result, setResult] = useState({ finish: '', payout: '', memo: '' });
  const [history, setHistory] = useState([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setHistory(JSON.parse(saved));
    } catch (e) {}
  }, []);

  const probs = useMemo(() => addProbabilities(racers, condition), [condition]);
  const allBets = useMemo(() => trifectaCombinations(probs, oddsMap), [probs, oddsMap]);
  const rankingBets = allBets.slice(0, 20);
  const plan = useMemo(() => buildBetPlan(allBets, Number(unit || 100)), [allBets, unit]);
  const totalStake = plan.reduce((sum, b) => sum + b.amount, 0);
  const hit = plan.find(b => b.bet === result.finish);
  const returnMoney = hit ? Number(result.payout || 0) * (hit.amount / 100) : 0;
  const profit = result.finish ? returnMoney - totalStake : 0;

  const stats = useMemo(() => {
    const total = history.length;
    const hits = history.filter(h => h.hit).length;
    const stake = history.reduce((s, h) => s + h.stake, 0);
    const returns = history.reduce((s, h) => s + h.returnMoney, 0);
    const profit = returns - stake;
    const hitRate = total ? hits / total * 100 : 0;
    const roi = stake ? returns / stake * 100 : 0;
    return { total, hits, stake, returns, profit, hitRate, roi };
  }, [history]);

  const venueStats = useMemo(() => groupStats(history, h => h.venue), [history]);
  const raceStats = useMemo(() => groupStats(history, h => `${h.raceNo}R`), [history]);
  const evStats = useMemo(() => groupStats(history, h => {
    if (h.bestEv >= 140) return 'EV140以上';
    if (h.bestEv >= 120) return 'EV120〜139';
    if (h.bestEv >= 100) return 'EV100〜119';
    return 'EV100未満';
  }), [history]);
  const aiStats = useMemo(() => buildAiStats(history), [history]);

  function openVenue(v) {
    setVenue(v);
    setCondition({ wind: v.wind, wave: v.wave, weather: v.weather });
    setScreen('races');
  }

  function openRace(n) {
    setRaceNo(n);
    setOddsMap({});
    setResult({ finish: '', payout: '', memo: '' });
    setScreen('predict');
  }

  function updateOdds(bet, value) {
    setOddsMap(prev => ({ ...prev, [bet]: value }));
  }

  function saveResult() {
    if (!venue || !raceNo || !result.finish) return;
    const record = {
      id: `${Date.now()}-${venue.id}-${raceNo}`,
      date: new Date().toISOString(),
      venue: venue.name,
      raceNo,
      condition,
      finish: result.finish,
      payout: Number(result.payout || 0),
      hit: Boolean(hit),
      stake: totalStake,
      returnMoney,
      profit,
      bestBet: plan[0]?.bet || '',
      bestEv: plan[0]?.ev || 0,
      aiModel: chooseAiModel(condition, plan[0]),
      bought: plan.map(b => ({ bet: b.bet, amount: b.amount, ev: b.ev })),
      memo: result.memo
    };
    const next = [record, ...history].slice(0, 200);
    setHistory(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function clearHistory() {
    if (!confirm('保存成績をすべて削除しますか？')) return;
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <main className="container">
      <div className="header">
        <div>
          <div className="logo">Boat AI</div>
          <div className="sub">確率・期待値・結果検証で競艇を分析</div>
        </div>
        <div className="row">
          <button className="btn secondary" onClick={() => setScreen('stats')}>成績</button>
          {screen !== 'venues' && <button className="btn secondary" onClick={() => setScreen(screen === 'predict' ? 'races' : 'venues')}>戻る</button>}
        </div>
      </div>

      {screen === 'venues' && (
        <section className="screen active">
          <div className="section title">本日開催</div>
          <div className="grid">
            {venues.map(v => (
              <div className="card clickable" key={v.id} onClick={() => openVenue(v)}>
                <div className="row"><div className="title">{v.name}</div><span className="badge">{v.status}</span></div>
                <div className="small">天候 {v.weather} / 風 {v.wind}m / 波 {v.wave}cm</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {screen === 'races' && venue && (
        <section className="screen active">
          <div className="section title">{venue.name} レース選択</div>
          <div className="race-buttons">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(n => <button key={n} onClick={() => openRace(n)}>{n}R</button>)}
          </div>
        </section>
      )}

      {screen === 'stats' && (
        <section className="screen active">
          <div className="row section">
            <div className="title">成績ダッシュボード</div>
            <button className="btn secondary" onClick={clearHistory}>成績削除</button>
          </div>
          <div className="summary section">
            <div className="metric"><span className="small">検証レース</span><b>{stats.total}</b></div>
            <div className="metric"><span className="small">的中率</span><b>{stats.hitRate.toFixed(1)}%</b></div>
            <div className="metric"><span className="small">回収率</span><b className={stats.roi >= 100 ? 'good' : 'bad'}>{stats.roi.toFixed(1)}%</b></div>
            <div className="metric"><span className="small">総投資</span><b>{stats.stake.toLocaleString()}円</b></div>
            <div className="metric"><span className="small">総払戻</span><b>{stats.returns.toLocaleString()}円</b></div>
            <div className="metric"><span className="small">総収支</span><b className={stats.profit >= 0 ? 'good' : 'bad'}>{stats.profit.toLocaleString()}円</b></div>
          </div>

          <div className="section split">
            <StatsTable title="競艇場別成績" rows={venueStats} />
            <StatsTable title="レース番号別成績" rows={raceStats} />
          </div>

          <div className="section split">
            <StatsTable title="期待値ランク別成績" rows={evStats} />
            <StatsTable title="AI別成績" rows={aiStats} />
          </div>

          <div className="section table-wrap">
            <div className="title">保存履歴</div>
            <table className="table"><thead><tr><th>日付</th><th>場</th><th>R</th><th>結果</th><th>判定</th><th>AI</th><th>投資</th><th>払戻</th><th>収支</th><th>本命買い目</th><th>EV</th><th>メモ</th></tr></thead><tbody>
              {history.map(h => <tr key={h.id}><td>{new Date(h.date).toLocaleString('ja-JP')}</td><td>{h.venue}</td><td>{h.raceNo}R</td><td>{h.finish}</td><td className={h.hit ? 'good' : 'bad'}>{h.hit ? '的中' : '不的中'}</td><td>{h.aiModel || '総合AI'}</td><td>{h.stake.toLocaleString()}円</td><td>{h.returnMoney.toLocaleString()}円</td><td className={h.profit >= 0 ? 'good' : 'bad'}>{h.profit.toLocaleString()}円</td><td>{h.bestBet}</td><td>{Number(h.bestEv || 0).toFixed(0)}</td><td>{h.memo}</td></tr>)}
              {history.length === 0 && <tr><td colSpan="12" className="small">まだ保存成績がありません</td></tr>}
            </tbody></table>
          </div>
        </section>
      )}

      {screen === 'predict' && venue && (
        <section className="screen active">
          <div className="row">
            <div className="title">{venue.name} {raceNo}R AI予想</div>
            <span className="badge">Ver0.6</span>
          </div>

          <div className="summary section">
            <div className="metric"><span className="small">判定</span><b className={plan.length ? 'good' : 'warn'}>{plan.length ? '買い候補' : '見送り'}</b></div>
            <div className="metric"><span className="small">最高期待値</span><b>{allBets[0]?.ev.toFixed(0)}</b></div>
            <div className="metric"><span className="small">本命艇</span><b>{probs[0]?.lane}号艇</b></div>
            <div className="metric"><span className="small">投資予定</span><b>{totalStake.toLocaleString()}円</b></div>
          </div>

          <div className="section card">
            <div className="title">条件入力</div>
            <div className="row">
              <label>天候 <select value={condition.weather} onChange={e => setCondition({ ...condition, weather: e.target.value })}><option>晴</option><option>曇</option><option>雨</option></select></label>
              <label>風速 <input type="number" value={condition.wind} onChange={e => setCondition({ ...condition, wind: Number(e.target.value) })} />m</label>
              <label>波高 <input type="number" value={condition.wave} onChange={e => setCondition({ ...condition, wave: Number(e.target.value) })} />cm</label>
              <label>1点金額 <input type="number" value={unit} onChange={e => setUnit(Number(e.target.value))} />円</label>
            </div>
          </div>

          <div className="section table-wrap">
            <div className="title">各艇確率</div>
            <table className="table"><thead><tr><th>艇</th><th>選手</th><th>級</th><th>全国</th><th>当地</th><th>ST</th><th>モーター</th><th>展示</th><th>1着率</th><th>2連率</th><th>3連率</th></tr></thead><tbody>
              {probs.map(r => <tr key={r.lane}><td>{r.lane}</td><td>{r.name}</td><td>{r.rank}</td><td>{r.national}</td><td>{r.local}</td><td>{r.st}</td><td>{r.motor}%</td><td>{r.exhibit}</td><td className="percent">{(r.winProb*100).toFixed(1)}%</td><td>{(r.top2Prob*100).toFixed(1)}%</td><td>{(r.top3Prob*100).toFixed(1)}%</td></tr>)}
            </tbody></table>
          </div>

          <div className="section table-wrap">
            <div className="title">期待値ランキング（オッズ入力可）</div>
            <table className="table"><thead><tr><th>買い目</th><th>的中確率</th><th>オッズ</th><th>期待値</th><th>判定</th></tr></thead><tbody>
              {rankingBets.map(b => {
                const judge = judgeEv(b.ev);
                return <tr key={b.bet}><td>{b.bet}</td><td>{(b.probability*100).toFixed(2)}%</td><td><input className="odds" type="number" step="0.1" value={oddsMap[b.bet] ?? b.odds} onChange={e => updateOdds(b.bet, e.target.value)} /></td><td className={judge.className}>{b.ev.toFixed(0)}</td><td>{judge.label}</td></tr>;
              })}
            </tbody></table>
          </div>

          <div className="section table-wrap">
            <div className="title">推奨買い目</div>
            {plan.length === 0 ? <div className="card warn">期待値120以上がないため見送り推奨</div> :
              <table className="table"><thead><tr><th>買い目</th><th>期待値</th><th>金額</th></tr></thead><tbody>
                {plan.map(b => <tr key={b.bet}><td>{b.bet}</td><td className="good">{b.ev.toFixed(0)}</td><td>{b.amount.toLocaleString()}円</td></tr>)}
              </tbody></table>}
          </div>

          <div className="section card">
            <div className="title">結果入力・保存</div>
            <div className="row">
              <label>確定3連単 <input placeholder="例 1-3-2" value={result.finish} onChange={e => setResult({ ...result, finish: e.target.value })} /></label>
              <label>払戻金/100円 <input type="number" placeholder="例 18500" value={result.payout} onChange={e => setResult({ ...result, payout: e.target.value })} /></label>
              <label>メモ <input placeholder="展示悪い等" value={result.memo} onChange={e => setResult({ ...result, memo: e.target.value })} /></label>
              <button className="btn" onClick={saveResult} disabled={!result.finish}>結果を保存</button>
            </div>
            {result.finish && <div className="result-box">
              <b className={hit ? 'good' : 'bad'}>{hit ? '的中' : '不的中'}</b>
              <span> 投資 {totalStake.toLocaleString()}円 / 払戻 {returnMoney.toLocaleString()}円 / 収支 </span>
              <b className={profit >= 0 ? 'good' : 'bad'}>{profit.toLocaleString()}円</b>
            </div>}
          </div>
        </section>
      )}
    </main>
  );
}


function StatsTable({ title, rows }) {
  return (
    <div className="card table-wrap">
      <div className="title">{title}</div>
      <table className="table compact"><thead><tr><th>分類</th><th>R数</th><th>的中率</th><th>回収率</th><th>収支</th></tr></thead><tbody>
        {rows.map(r => <tr key={r.key}><td>{r.key}</td><td>{r.total}</td><td>{r.hitRate.toFixed(1)}%</td><td className={r.roi >= 100 ? 'good' : 'bad'}>{r.roi.toFixed(1)}%</td><td className={r.profit >= 0 ? 'good' : 'bad'}>{r.profit.toLocaleString()}円</td></tr>)}
        {rows.length === 0 && <tr><td colSpan="5" className="small">データなし</td></tr>}
      </tbody></table>
    </div>
  );
}

function groupStats(records, keyFn) {
  const map = new Map();
  records.forEach(r => {
    const key = keyFn(r) || '未分類';
    if (!map.has(key)) map.set(key, { key, total: 0, hits: 0, stake: 0, returns: 0 });
    const item = map.get(key);
    item.total += 1;
    item.hits += r.hit ? 1 : 0;
    item.stake += Number(r.stake || 0);
    item.returns += Number(r.returnMoney || 0);
  });
  return Array.from(map.values()).map(x => ({
    ...x,
    profit: x.returns - x.stake,
    hitRate: x.total ? x.hits / x.total * 100 : 0,
    roi: x.stake ? x.returns / x.stake * 100 : 0
  })).sort((a, b) => b.roi - a.roi || b.total - a.total);
}

function chooseAiModel(condition, topBet) {
  const wind = Number(condition?.wind || 0);
  const ev = Number(topBet?.ev || 0);
  if (ev >= 145) return '期待値AI';
  if (wind >= 5) return '展示・荒れAI';
  if ((topBet?.bet || '').startsWith('1-')) return 'イン重視AI';
  return '総合AI';
}

function buildAiStats(history) {
  const base = groupStats(history, h => h.aiModel || '総合AI');
  const names = ['イン重視AI', '展示・荒れAI', 'モーターAI', '期待値AI', '総合AI'];
  const keys = new Set(base.map(x => x.key));
  const rows = [...base];
  names.forEach(name => {
    if (!keys.has(name)) rows.push({ key: name, total: 0, hits: 0, stake: 0, returns: 0, profit: 0, hitRate: 0, roi: 0 });
  });
  return rows.sort((a, b) => b.roi - a.roi || b.total - a.total);
}
