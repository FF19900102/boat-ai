'use client'

import { useMemo, useState, useEffect } from 'react'
import { stadiums, makeRace } from '../lib/data'
import { analyzeRace, judge } from '../lib/engine'

export default function Home() {
  const [stadiumId, setStadiumId] = useState(stadiums[0].id)
  const stadium = stadiums.find((s) => s.id === stadiumId) || stadiums[0]
  const [raceNo, setRaceNo] = useState(1)
  const [ticket, setTicket] = useState({ buyKey: '', amount: 100, resultKey: '', payout: 0 })
  const [history, setHistory] = useState([])

  useEffect(() => {
    const saved = localStorage.getItem('boat-ai-history')
    if (saved) setHistory(JSON.parse(saved))
  }, [])

  const race = useMemo(() => makeRace(stadium, raceNo), [stadium, raceNo])
  const analysis = useMemo(() => analyzeRace(race), [race])
  const best = analysis.trifectas[0]

  function saveResult() {
    const hit = ticket.buyKey && ticket.buyKey === ticket.resultKey
    const profit = hit ? Number(ticket.payout) - Number(ticket.amount) : -Number(ticket.amount)
    const record = {
      id: `${Date.now()}`,
      date: new Date().toLocaleString('ja-JP'),
      race: race.title,
      buyKey: ticket.buyKey,
      resultKey: ticket.resultKey,
      amount: Number(ticket.amount),
      payout: hit ? Number(ticket.payout) : 0,
      hit,
      profit,
    }
    const next = [record, ...history].slice(0, 50)
    setHistory(next)
    localStorage.setItem('boat-ai-history', JSON.stringify(next))
  }

  const stats = history.reduce((acc, h) => {
    acc.amount += h.amount
    acc.payout += h.payout
    acc.hit += h.hit ? 1 : 0
    acc.profit += h.profit
    return acc
  }, { amount: 0, payout: 0, hit: 0, profit: 0 })
  const returnRate = stats.amount ? Math.round((stats.payout / stats.amount) * 100) : 0

  return (
    <main className="wrap">
      <header className="hero">
        <div>
          <p className="label">Boat AI v2</p>
          <h1>競艇AI 確率・期待値分析</h1>
          <p>開催場 → レース → AI予想 → 結果反映まで動く土台。</p>
        </div>
        <div className="statBox"><b>{returnRate}%</b><span>回収率</span></div>
      </header>

      <section className="card">
        <h2>本日開催</h2>
        <div className="stadiums">
          {stadiums.map((s) => (
            <button key={s.id} onClick={() => { setStadiumId(s.id); setRaceNo(1) }} className={s.id === stadiumId ? 'active' : ''}>
              <b>{s.name}</b><span>{s.status}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>{stadium.name} レース選択</h2>
        <div className="races">
          {Array.from({ length: stadium.races }, (_, i) => i + 1).map((n) => (
            <button key={n} onClick={() => setRaceNo(n)} className={n === raceNo ? 'active' : ''}>{n}R</button>
          ))}
        </div>
      </section>

      <section className="grid two">
        <div className="card">
          <h2>{race.title} 出走表</h2>
          <p className="weather">{race.weather.condition} / {race.weather.windDirection} {race.weather.windSpeed}m / 波 {race.weather.wave}cm</p>
          <table>
            <thead><tr><th>枠</th><th>選手</th><th>級</th><th>勝率</th><th>ST</th><th>展示</th><th>モーター</th></tr></thead>
            <tbody>{race.boats.map(b => <tr key={b.lane}><td>{b.lane}</td><td>{b.name}</td><td>{b.class}</td><td>{b.nationalWin}</td><td>{b.avgST}</td><td>{b.exhibition}</td><td>{b.motorRate}%</td></tr>)}</tbody>
          </table>
        </div>
        <div className="card">
          <h2>AI確率</h2>
          <table>
            <thead><tr><th>枠</th><th>1着率</th><th>2連率</th><th>3連率</th><th>スコア</th></tr></thead>
            <tbody>{analysis.boats.map(b => <tr key={b.lane}><td>{b.lane}</td><td>{(b.firstProb*100).toFixed(1)}%</td><td>{(b.top2Prob*100).toFixed(1)}%</td><td>{(b.top3Prob*100).toFixed(1)}%</td><td>{b.score.toFixed(1)}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="card highlight">
        <h2>推奨</h2>
        <div className="recommend"><b>{best.key}</b><span>確率 {(best.prob*100).toFixed(2)}%</span><span>想定オッズ {best.odds}</span><span>期待値 {best.ev.toFixed(0)}</span><strong>{judge(best.ev)}</strong></div>
      </section>

      <section className="card">
        <h2>期待値ランキング TOP20</h2>
        <table>
          <thead><tr><th>買い目</th><th>確率</th><th>オッズ</th><th>期待値</th><th>判定</th></tr></thead>
          <tbody>{analysis.trifectas.slice(0,20).map(x => <tr key={x.key}><td>{x.key}</td><td>{(x.prob*100).toFixed(2)}%</td><td>{x.odds}</td><td>{x.ev.toFixed(0)}</td><td>{judge(x.ev)}</td></tr>)}</tbody>
        </table>
      </section>

      <section className="grid two">
        <div className="card">
          <h2>結果反映</h2>
          <div className="form">
            <label>購入買い目<input value={ticket.buyKey} onChange={e=>setTicket({...ticket,buyKey:e.target.value})} placeholder="例 1-3-2" /></label>
            <label>投資額<input type="number" value={ticket.amount} onChange={e=>setTicket({...ticket,amount:e.target.value})} /></label>
            <label>確定結果<input value={ticket.resultKey} onChange={e=>setTicket({...ticket,resultKey:e.target.value})} placeholder="例 1-3-2" /></label>
            <label>払戻金<input type="number" value={ticket.payout} onChange={e=>setTicket({...ticket,payout:e.target.value})} /></label>
            <button className="primary" onClick={saveResult}>結果を保存</button>
          </div>
        </div>
        <div className="card">
          <h2>成績</h2>
          <div className="stats"><div><b>{history.length}</b><span>件数</span></div><div><b>{stats.hit}</b><span>的中</span></div><div><b>{returnRate}%</b><span>回収率</span></div><div><b>{stats.profit.toLocaleString()}円</b><span>収支</span></div></div>
          <ul className="history">{history.slice(0,8).map(h => <li key={h.id}><b>{h.hit?'的中':'不的中'}</b> {h.race} {h.buyKey} / 結果 {h.resultKey} / {h.profit.toLocaleString()}円</li>)}</ul>
        </div>
      </section>
    </main>
  )
}
