'use client'

import { useMemo, useState, useEffect } from 'react'
import { venues, sampleBoats } from '@/lib/mockData'
import { Boat, RaceContext, SavedResult } from '@/lib/types'
import { generateBets, makePredictions, summarizeResults } from '@/lib/ai'

const STORAGE_KEY = 'boat-ai-results-v2'

export default function BoatAiApp() {
  const [venue, setVenue] = useState(venues[5].name)
  const [raceNo, setRaceNo] = useState(1)
  const [stage, setStage] = useState<'venue' | 'race' | 'predict'>('venue')
  const [boats, setBoats] = useState<Boat[]>(sampleBoats)
  const [context, setContext] = useState<RaceContext>({ venue: venues[5].name, raceNo: 1, weather: '晴', wind: 2, wave: 2 })
  const [oddsMap, setOddsMap] = useState<Record<string, number>>({ '1-2-3': 12.5, '1-3-2': 15.2, '3-1-2': 38.5, '1-3-4': 18.8, '3-1-4': 44.2 })
  const [result, setResult] = useState('')
  const [betKey, setBetKey] = useState('')
  const [stake, setStake] = useState(1000)
  const [payout, setPayout] = useState(0)
  const [saved, setSaved] = useState<SavedResult[]>([])

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) setSaved(JSON.parse(raw))
  }, [])

  useEffect(() => {
    setContext(c => ({ ...c, venue, raceNo }))
  }, [venue, raceNo])

  const predictions = useMemo(() => makePredictions(boats, context), [boats, context])
  const bets = useMemo(() => generateBets(predictions, oddsMap), [predictions, oddsMap])
  const stats = useMemo(() => summarizeResults(saved), [saved])

  function updateBoat(index: number, key: keyof Boat, value: string) {
    setBoats(prev => prev.map((b, i) => i === index ? { ...b, [key]: key === 'name' || key === 'className' ? value : Number(value) } : b))
  }

  function updateOdd(key: string, value: string) {
    setOddsMap(prev => ({ ...prev, [key]: Number(value) }))
  }

  function saveResult() {
    const hit = result.trim() === betKey.trim()
    const item: SavedResult = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      venue,
      raceNo,
      result,
      betKey,
      stake: Number(stake),
      payout: Number(payout),
      profit: Number(payout) - Number(stake),
      hit
    }
    const next = [item, ...saved]
    setSaved(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
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
        </div>
      </div>

      {stage === 'venue' && (
        <section>
          <div className="sectionTitle">本日開催場</div>
          <div className="grid venues">
            {venues.map(v => (
              <button key={v.id} className={venue === v.name ? '' : 'secondary'} onClick={() => { setVenue(v.name); setStage('race') }}>
                {v.name}{v.night ? ' 🌙' : ''}
              </button>
            ))}
          </div>
        </section>
      )}

      {stage === 'race' && (
        <section>
          <div className="sectionTitle">{venue} レース選択</div>
          <div className="grid races">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
              <button key={n} className={raceNo === n ? '' : 'secondary'} onClick={() => { setRaceNo(n); setStage('predict') }}>{n}R</button>
            ))}
          </div>
        </section>
      )}

      {stage === 'predict' && (
        <section>
          <div className="card">
            <div className="sectionTitle" style={{marginTop:0}}>{venue} {raceNo}R</div>
            <div className="formGrid">
              <div><label>天候</label><select value={context.weather} onChange={e => setContext({...context, weather:e.target.value})}><option>晴</option><option>曇</option><option>雨</option></select></div>
              <div><label>風速 m</label><input type="number" value={context.wind} onChange={e => setContext({...context, wind:Number(e.target.value)})}/></div>
              <div><label>波高 cm</label><input type="number" value={context.wave} onChange={e => setContext({...context, wave:Number(e.target.value)})}/></div>
            </div>
          </div>

          <div className="sectionTitle">出走表入力</div>
          <div className="tableWrap card">
            <table>
              <thead><tr><th>艇</th><th>選手</th><th>級</th><th>全国</th><th>当地</th><th>ST</th><th>モーター</th><th>ボート</th><th>展示</th><th>体重</th></tr></thead>
              <tbody>
                {boats.map((b, i) => (
                  <tr key={b.lane}>
                    <td className="rank">{b.lane}</td>
                    <td><input value={b.name} onChange={e => updateBoat(i, 'name', e.target.value)} /></td>
                    <td><input value={b.className} onChange={e => updateBoat(i, 'className', e.target.value)} /></td>
                    <td><input type="number" step="0.1" value={b.nationalWin} onChange={e => updateBoat(i, 'nationalWin', e.target.value)} /></td>
                    <td><input type="number" step="0.1" value={b.localWin} onChange={e => updateBoat(i, 'localWin', e.target.value)} /></td>
                    <td><input type="number" step="0.01" value={b.avgST} onChange={e => updateBoat(i, 'avgST', e.target.value)} /></td>
                    <td><input type="number" value={b.motorRate} onChange={e => updateBoat(i, 'motorRate', e.target.value)} /></td>
                    <td><input type="number" value={b.boatRate} onChange={e => updateBoat(i, 'boatRate', e.target.value)} /></td>
                    <td><input type="number" step="0.01" value={b.exhibition} onChange={e => updateBoat(i, 'exhibition', e.target.value)} /></td>
                    <td><input type="number" step="0.1" value={b.weight} onChange={e => updateBoat(i, 'weight', e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sectionTitle">AI確率</div>
          <div className="tableWrap card">
            <table>
              <thead><tr><th>順位</th><th>艇</th><th>選手</th><th>スコア</th><th>1着率</th><th>2連対</th><th>3連対</th></tr></thead>
              <tbody>
                {predictions.map((p, i) => (
                  <tr key={p.lane} className={i === 0 ? 'top' : ''}>
                    <td className="rank">{i + 1}</td><td>{p.lane}</td><td>{p.name}</td><td>{p.score.toFixed(1)}</td><td>{(p.firstRate*100).toFixed(1)}%</td><td>{(p.top2Rate*100).toFixed(1)}%</td><td>{(p.top3Rate*100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sectionTitle">3連単 期待値ランキング</div>
          <div className="tableWrap card">
            <table>
              <thead><tr><th>買い目</th><th>的中確率</th><th>オッズ</th><th>期待値</th><th>判定</th></tr></thead>
              <tbody>
                {bets.slice(0, 20).map(b => (
                  <tr key={b.key}>
                    <td className="mono rank">{b.key}</td>
                    <td>{(b.probability*100).toFixed(2)}%</td>
                    <td><input type="number" step="0.1" value={oddsMap[b.key] || ''} onChange={e => updateOdd(b.key, e.target.value)} /></td>
                    <td className="rank">{b.ev.toFixed(0)}</td>
                    <td><span className={`badge ${b.ev >= 120 ? 'buy' : b.ev >= 100 ? 'hold' : 'skip'}`}>{b.judgment}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="small">期待値 = 的中確率 × オッズ × 100。120以上を買い候補にしています。</p>
          </div>

          <div className="sectionTitle">結果入力・保存</div>
          <div className="card formGrid">
            <div><label>確定3連単</label><input placeholder="1-3-2" value={result} onChange={e => setResult(e.target.value)} /></div>
            <div><label>購入買い目</label><input placeholder="1-3-2" value={betKey} onChange={e => setBetKey(e.target.value)} /></div>
            <div><label>投資額</label><input type="number" value={stake} onChange={e => setStake(Number(e.target.value))} /></div>
            <div><label>払戻金</label><input type="number" value={payout} onChange={e => setPayout(Number(e.target.value))} /></div>
            <div style={{display:'flex',alignItems:'end'}}><button className="green" onClick={saveResult}>結果保存</button></div>
          </div>

          <div className="sectionTitle">成績</div>
          <div className="stats">
            <div className="card"><div className="small">レース数</div><div className="statNum">{stats.races}</div></div>
            <div className="card"><div className="small">的中率</div><div className="statNum">{(stats.hitRate*100).toFixed(1)}%</div></div>
            <div className="card"><div className="small">回収率</div><div className="statNum">{(stats.roi*100).toFixed(1)}%</div></div>
            <div className="card"><div className="small">収支</div><div className="statNum">{stats.profit.toLocaleString()}円</div></div>
          </div>
        </section>
      )}
    </main>
  )
}
