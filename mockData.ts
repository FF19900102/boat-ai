'use client'

import { useMemo, useState, useEffect } from 'react'
import { venues, sampleBoats } from '@/lib/mockData'
import { BetPurchase, Boat, RaceContext, SavedResult } from '@/lib/types'
import { generateBets, makePredictions, summarizeByVenue, summarizeResults } from '@/lib/ai'

const STORAGE_KEY = 'boat-ai-results-v3'
const RACE_KEY = 'boat-ai-current-race-v3'

export default function BoatAiApp() {
  const [venue, setVenue] = useState(venues[5].name)
  const [raceNo, setRaceNo] = useState(1)
  const [stage, setStage] = useState<'venue' | 'race' | 'predict' | 'history'>('venue')
  const [boats, setBoats] = useState<Boat[]>(sampleBoats)
  const [context, setContext] = useState<RaceContext>({ venue: venues[5].name, raceNo: 1, weather: '晴', wind: 2, wave: 2 })
  const [oddsMap, setOddsMap] = useState<Record<string, number>>({ '1-2-3': 12.5, '1-3-2': 15.2, '3-1-2': 38.5, '1-3-4': 18.8, '3-1-4': 44.2 })
  const [purchases, setPurchases] = useState<BetPurchase[]>([])
  const [result, setResult] = useState('')
  const [payout, setPayout] = useState(0)
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState<SavedResult[]>([])

  useEffect(() => {
    const rawResults = localStorage.getItem(STORAGE_KEY)
    if (rawResults) setSaved(JSON.parse(rawResults))
    const rawRace = localStorage.getItem(RACE_KEY)
    if (rawRace) {
      const data = JSON.parse(rawRace)
      setVenue(data.venue || venues[5].name)
      setRaceNo(data.raceNo || 1)
      setBoats(data.boats || sampleBoats)
      setContext(data.context || { venue: venues[5].name, raceNo: 1, weather: '晴', wind: 2, wave: 2 })
      setOddsMap(data.oddsMap || {})
      setPurchases(data.purchases || [])
    }
  }, [])

  useEffect(() => {
    setContext(c => ({ ...c, venue, raceNo }))
  }, [venue, raceNo])

  useEffect(() => {
    localStorage.setItem(RACE_KEY, JSON.stringify({ venue, raceNo, boats, context, oddsMap, purchases }))
  }, [venue, raceNo, boats, context, oddsMap, purchases])

  const predictions = useMemo(() => makePredictions(boats, context), [boats, context])
  const bets = useMemo(() => generateBets(predictions, oddsMap), [predictions, oddsMap])
  const stats = useMemo(() => summarizeResults(saved), [saved])
  const venueStats = useMemo(() => summarizeByVenue(saved), [saved])
  const totalStake = purchases.reduce((s, p) => s + Number(p.stake || 0), 0)
  const recommended = bets.filter(b => b.judgment === '買い候補').slice(0, 8)
  const buySignal = recommended.length ? `買い候補 ${recommended.length}点` : '見送り推奨'

  function updateBoat(index: number, key: keyof Boat, value: string) {
    setBoats(prev => prev.map((b, i) => i === index ? { ...b, [key]: key === 'name' || key === 'className' ? value : Number(value) } : b))
  }

  function updateOdd(key: string, value: string) {
    setOddsMap(prev => ({ ...prev, [key]: Number(value) }))
  }

  function addPurchase(key: string, stake = 100) {
    const bet = bets.find(b => b.key === key)
    if (!bet) return
    setPurchases(prev => {
      const exists = prev.find(p => p.key === key)
      if (exists) return prev.map(p => p.key === key ? { ...p, stake: p.stake + stake, odds: bet.odds, ev: bet.ev } : p)
      return [...prev, { key, stake, odds: bet.odds, ev: bet.ev }]
    })
  }

  function updatePurchase(key: string, stake: string) {
    setPurchases(prev => prev.map(p => p.key === key ? { ...p, stake: Number(stake) } : p))
  }

  function removePurchase(key: string) {
    setPurchases(prev => prev.filter(p => p.key !== key))
  }

  function addRecommended() {
    const next = recommended.slice(0, 5).map(b => ({ key: b.key, stake: 100, odds: b.odds, ev: b.ev }))
    setPurchases(next)
  }

  function saveResult() {
    const normalized = result.trim()
    const hitPurchase = purchases.find(p => p.key === normalized)
    const item: SavedResult = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      venue,
      raceNo,
      result: normalized,
      purchases,
      stake: totalStake,
      payout: Number(payout),
      profit: Number(payout) - totalStake,
      hit: !!hitPurchase,
      note
    }
    const next = [item, ...saved]
    setSaved(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setResult('')
    setPayout(0)
    setNote('')
  }

  function exportData() {
    const data = { version: 3, saved, current: { venue, raceNo, boats, context, oddsMap, purchases } }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `boat-ai-backup-${new Date().toISOString().slice(0,10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function importData(file?: File) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const data = JSON.parse(String(reader.result))
      if (data.saved) {
        setSaved(data.saved)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.saved))
      }
      if (data.current) {
        setVenue(data.current.venue || venue)
        setRaceNo(data.current.raceNo || raceNo)
        setBoats(data.current.boats || boats)
        setContext(data.current.context || context)
        setOddsMap(data.current.oddsMap || oddsMap)
        setPurchases(data.current.purchases || [])
      }
    }
    reader.readAsText(file)
  }

  return (
    <main className="wrap">
      <div className="header">
        <div>
          <div className="title">Boat AI</div>
          <div className="sub">確率・期待値・結果検証で競艇を分析</div>
        </div>
        <div className="tabs">
          <button className={stage === 'venue' ? '' : 'secondary'} onClick={() => setStage('venue')}>開催場</button>
          <button className={stage === 'race' ? '' : 'secondary'} onClick={() => setStage('race')}>レース</button>
          <button className={stage === 'predict' ? '' : 'secondary'} onClick={() => setStage('predict')}>AI予想</button>
          <button className={stage === 'history' ? '' : 'secondary'} onClick={() => setStage('history')}>成績</button>
        </div>
      </div>

      {stage === 'venue' && (
        <section>
          <div className="sectionTitle">本日開催場</div>
          <div className="grid venues">
            {venues.map(v => (
              <div className="card" key={v.id}>
                <div className="rank">{v.name}</div>
                <div className="small">{v.night ? 'ナイター' : '通常開催'}</div>
                <button style={{ marginTop: 12 }} onClick={() => { setVenue(v.name); setStage('race') }}>選択</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {stage === 'race' && (
        <section>
          <div className="sectionTitle">{venue} レース選択</div>
          <div className="grid races">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(no => (
              <button key={no} className={raceNo === no ? '' : 'secondary'} onClick={() => { setRaceNo(no); setStage('predict') }}>{no}R</button>
            ))}
          </div>
        </section>
      )}

      {stage === 'predict' && (
        <section>
          <div className="card">
            <div className="sectionTitle" style={{ marginTop: 0 }}>{venue} {raceNo}R</div>
            <div className="stats">
              <div className="card"><div className="small">AI判定</div><div className="statNum">{buySignal}</div></div>
              <div className="card"><div className="small">買い予定</div><div className="statNum">{totalStake.toLocaleString()}円</div></div>
              <div className="card"><div className="small">上位EV</div><div className="statNum">{bets[0]?.ev.toFixed(0) || 0}</div></div>
              <div className="card"><div className="small">本命1着率</div><div className="statNum">{((predictions[0]?.firstRate || 0) * 100).toFixed(1)}%</div></div>
            </div>
          </div>

          <div className="sectionTitle">レース条件</div>
          <div className="card formGrid">
            <div><label>天候</label><select value={context.weather} onChange={e => setContext({ ...context, weather: e.target.value })}><option>晴</option><option>曇</option><option>雨</option><option>雪</option></select></div>
            <div><label>風速 m</label><input type="number" value={context.wind} onChange={e => setContext({ ...context, wind: Number(e.target.value) })} /></div>
            <div><label>波高 cm</label><input type="number" value={context.wave} onChange={e => setContext({ ...context, wave: Number(e.target.value) })} /></div>
            <div><label>場</label><input value={venue} onChange={e => setVenue(e.target.value)} /></div>
            <div><label>R</label><input type="number" value={raceNo} onChange={e => setRaceNo(Number(e.target.value))} /></div>
            <div><label>操作</label><button className="secondary" onClick={() => setBoats(sampleBoats)}>サンプル復元</button></div>
          </div>

          <div className="sectionTitle">出走表入力</div>
          <div className="tableWrap card">
            <table>
              <thead><tr><th>艇</th><th>選手</th><th>級</th><th>全国</th><th>当地</th><th>ST</th><th>モーター</th><th>ボート</th><th>展示</th><th>チルト</th><th>体重</th></tr></thead>
              <tbody>{boats.map((b, i) => <tr key={b.lane}>
                <td className="rank">{b.lane}</td>
                <td><input value={b.name} onChange={e => updateBoat(i, 'name', e.target.value)} /></td>
                <td><input value={b.className} onChange={e => updateBoat(i, 'className', e.target.value)} /></td>
                <td><input type="number" step="0.01" value={b.nationalWin} onChange={e => updateBoat(i, 'nationalWin', e.target.value)} /></td>
                <td><input type="number" step="0.01" value={b.localWin} onChange={e => updateBoat(i, 'localWin', e.target.value)} /></td>
                <td><input type="number" step="0.01" value={b.avgST} onChange={e => updateBoat(i, 'avgST', e.target.value)} /></td>
                <td><input type="number" step="0.1" value={b.motorRate} onChange={e => updateBoat(i, 'motorRate', e.target.value)} /></td>
                <td><input type="number" step="0.1" value={b.boatRate} onChange={e => updateBoat(i, 'boatRate', e.target.value)} /></td>
                <td><input type="number" step="0.01" value={b.exhibition} onChange={e => updateBoat(i, 'exhibition', e.target.value)} /></td>
                <td><input type="number" step="0.5" value={b.tilt} onChange={e => updateBoat(i, 'tilt', e.target.value)} /></td>
                <td><input type="number" step="0.1" value={b.weight} onChange={e => updateBoat(i, 'weight', e.target.value)} /></td>
              </tr>)}</tbody>
            </table>
          </div>

          <div className="sectionTitle">AI確率</div>
          <div className="tableWrap card">
            <table><thead><tr><th>順位</th><th>艇</th><th>選手</th><th>スコア</th><th>1着率</th><th>2連対</th><th>3連対</th></tr></thead>
              <tbody>{predictions.map((p, i) => <tr key={p.lane} className={i === 0 ? 'top' : ''}><td>{i + 1}</td><td className="rank">{p.lane}</td><td>{p.name}</td><td>{p.score.toFixed(1)}</td><td>{(p.firstRate * 100).toFixed(1)}%</td><td>{(p.top2Rate * 100).toFixed(1)}%</td><td>{(p.top3Rate * 100).toFixed(1)}%</td></tr>)}</tbody>
            </table>
          </div>

          <div className="sectionTitle">期待値ランキング</div>
          <div className="tabs"><button className="green" onClick={addRecommended}>上位買い候補を追加</button><button className="secondary" onClick={() => setPurchases([])}>買い目クリア</button></div>
          <div className="tableWrap card">
            <table><thead><tr><th>買い目</th><th>確率</th><th>オッズ</th><th>期待値</th><th>判定</th><th>買い</th></tr></thead>
              <tbody>{bets.slice(0, 30).map(b => <tr key={b.key} className={b.judgment === '買い候補' ? 'top' : ''}>
                <td className="mono rank">{b.key}</td><td>{(b.probability * 100).toFixed(2)}%</td>
                <td><input type="number" step="0.1" value={b.odds || ''} onChange={e => updateOdd(b.key, e.target.value)} /></td>
                <td>{b.ev.toFixed(0)}</td><td><span className={`badge ${b.judgment === '買い候補' ? 'buy' : b.judgment === '注意' ? 'hold' : 'skip'}`}>{b.judgment}</span></td>
                <td><button className="secondary" onClick={() => addPurchase(b.key)}>追加</button></td>
              </tr>)}</tbody>
            </table>
          </div>

          <div className="sectionTitle">購入予定</div>
          <div className="tableWrap card">
            <table><thead><tr><th>買い目</th><th>金額</th><th>オッズ</th><th>期待値</th><th>削除</th></tr></thead>
              <tbody>{purchases.map(p => <tr key={p.key}><td className="mono rank">{p.key}</td><td><input type="number" value={p.stake} onChange={e => updatePurchase(p.key, e.target.value)} /></td><td>{p.odds}</td><td>{p.ev.toFixed(0)}</td><td><button className="red" onClick={() => removePurchase(p.key)}>削除</button></td></tr>)}</tbody>
            </table>
            <div style={{ marginTop: 10 }} className="rank">合計 {totalStake.toLocaleString()}円</div>
          </div>

          <div className="sectionTitle">結果入力</div>
          <div className="card formGrid">
            <div><label>確定3連単</label><input placeholder="例 1-3-2" value={result} onChange={e => setResult(e.target.value)} /></div>
            <div><label>払戻金</label><input type="number" value={payout} onChange={e => setPayout(Number(e.target.value))} /></div>
            <div><label>メモ</label><input value={note} onChange={e => setNote(e.target.value)} placeholder="展示よかった/荒れた等" /></div>
            <div><label>保存</label><button className="green" disabled={!result || purchases.length === 0} onClick={saveResult}>結果を保存</button></div>
          </div>
        </section>
      )}

      {stage === 'history' && (
        <section>
          <div className="sectionTitle">成績</div>
          <div className="stats">
            <div className="card"><div className="small">レース数</div><div className="statNum">{stats.races}</div></div>
            <div className="card"><div className="small">的中率</div><div className="statNum">{(stats.hitRate * 100).toFixed(1)}%</div></div>
            <div className="card"><div className="small">回収率</div><div className="statNum">{(stats.roi * 100).toFixed(1)}%</div></div>
            <div className="card"><div className="small">収支</div><div className="statNum">{stats.profit.toLocaleString()}円</div></div>
          </div>
          <div className="tabs"><button onClick={exportData}>バックアップ出力</button><label className="btn secondary">バックアップ読込<input type="file" accept="application/json" style={{ display: 'none' }} onChange={e => importData(e.target.files?.[0])} /></label><button className="red" onClick={() => { setSaved([]); localStorage.removeItem(STORAGE_KEY) }}>成績削除</button></div>

          <div className="sectionTitle">競艇場別成績</div>
          <div className="tableWrap card"><table><thead><tr><th>場</th><th>R数</th><th>的中率</th><th>回収率</th><th>収支</th></tr></thead><tbody>{venueStats.map(v => <tr key={v.venue}><td>{v.venue}</td><td>{v.races}</td><td>{(v.hitRate*100).toFixed(1)}%</td><td>{(v.roi*100).toFixed(1)}%</td><td>{v.profit.toLocaleString()}円</td></tr>)}</tbody></table></div>

          <div className="sectionTitle">履歴</div>
          <div className="tableWrap card"><table><thead><tr><th>日時</th><th>場</th><th>R</th><th>結果</th><th>買い目</th><th>投資</th><th>払戻</th><th>収支</th><th>メモ</th></tr></thead><tbody>{saved.map(r => <tr key={r.id}><td>{new Date(r.date).toLocaleString()}</td><td>{r.venue}</td><td>{r.raceNo}R</td><td className="mono">{r.result}</td><td className="mono">{r.purchases.map(p=>p.key).join(', ')}</td><td>{r.stake.toLocaleString()}</td><td>{r.payout.toLocaleString()}</td><td>{r.profit.toLocaleString()}</td><td>{r.note}</td></tr>)}</tbody></table></div>
        </section>
      )}
    </main>
  )
}
