import { AiModel, Bet, Boat, Prediction, RaceContext, SavedResult } from './types'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export const aiModels: AiModel[] = [
  { id: 'inside', name: 'イン重視AI', description: '1〜2コースと枠有利を強めに見る', weights: { lane: 1.35, national: 0.85, local: 0.9, st: 0.9, motor: 0.8, boat: 0.7, exhibition: 0.8, class: 0.8, weather: 1.0 } },
  { id: 'exhibition', name: '展示重視AI', description: '展示タイムと直前気配を強めに見る', weights: { lane: 0.85, national: 0.8, local: 0.85, st: 1.05, motor: 0.9, boat: 0.8, exhibition: 1.65, class: 0.8, weather: 1.1 } },
  { id: 'motor', name: 'モーター重視AI', description: 'モーター2連率とボート2連率を強めに見る', weights: { lane: 0.9, national: 0.85, local: 0.8, st: 0.9, motor: 1.65, boat: 1.35, exhibition: 0.8, class: 0.8, weather: 0.9 } },
  { id: 'value', name: '期待値重視AI', description: '中穴・外枠の妙味も拾う', weights: { lane: 0.7, national: 0.9, local: 0.9, st: 1.15, motor: 1.15, boat: 0.95, exhibition: 1.1, class: 0.85, weather: 1.25 } },
  { id: 'balanced', name: '総合AI', description: '枠・選手・展示・モーターをバランスよく見る', weights: { lane: 1.0, national: 1.0, local: 1.0, st: 1.0, motor: 1.0, boat: 1.0, exhibition: 1.0, class: 1.0, weather: 1.0 } }
]

export function scoreBoat(boat: Boat, context: RaceContext, model: AiModel = aiModels[4]): number {
  const w = model.weights
  const laneRaw = [0, 24, 12, 7, 3, -3, -8][boat.lane] ?? 0
  const classRaw = boat.className === 'A1' ? 8 : boat.className === 'A2' ? 4 : 0
  const stRaw = clamp((0.22 - boat.avgST) * 120, -8, 12)
  const exRaw = clamp((6.9 - boat.exhibition) * 45, -8, 10)
  const windPenalty = context.wind >= 5 && boat.lane === 1 ? -5 * w.weather : 0
  const wavePenalty = context.wave >= 5 && boat.lane >= 5 ? -3 * w.weather : 0
  const roughBonus = context.wind >= 5 && boat.lane >= 3 ? 2 * w.weather : 0

  return Math.max(1,
    boat.nationalWin * 8 * w.national +
    boat.localWin * 5 * w.local +
    boat.motorRate * 0.45 * w.motor +
    boat.boatRate * 0.25 * w.boat +
    stRaw * w.st +
    exRaw * w.exhibition +
    laneRaw * w.lane +
    classRaw * w.class +
    windPenalty + wavePenalty + roughBonus
  )
}

export function makePredictions(boats: Boat[], context: RaceContext, model: AiModel = aiModels[4]): Prediction[] {
  const scored = boats.map(b => ({ ...b, score: scoreBoat(b, context, model) }))
  const total = scored.reduce((s, b) => s + b.score, 0) || 1
  return scored.map(b => {
    const firstRate = b.score / total
    return {
      ...b,
      firstRate,
      top2Rate: clamp(firstRate * 1.75, 0, 0.92),
      top3Rate: clamp(firstRate * 2.35, 0, 0.98)
    }
  }).sort((a, b) => b.firstRate - a.firstRate)
}

export function generateBets(predictions: Prediction[], oddsMap: Record<string, number>): Bet[] {
  const byLane = new Map(predictions.map(p => [p.lane, p]))
  const lanes = predictions.map(p => p.lane)
  const bets: Bet[] = []

  for (const first of lanes) {
    for (const second of lanes) {
      for (const third of lanes) {
        if (first === second || first === third || second === third) continue
        const a = byLane.get(first)!
        const b = byLane.get(second)!
        const c = byLane.get(third)!
        const remainingAfterFirst = Math.max(0.01, 1 - a.firstRate)
        const secondProb = b.firstRate / remainingAfterFirst
        const remainingAfterSecond = Math.max(0.01, 1 - a.firstRate - b.firstRate)
        const thirdProb = c.firstRate / remainingAfterSecond
        const probability = clamp(a.firstRate * secondProb * thirdProb, 0, 0.45)
        const key = `${first}-${second}-${third}`
        const odds = oddsMap[key] || 0
        const ev = odds > 0 ? probability * odds * 100 : 0
        bets.push({ key, first, second, third, probability, odds, ev, judgment: ev >= 120 ? '買い候補' : ev >= 100 ? '注意' : '買わない' })
      }
    }
  }
  return bets.sort((a, b) => b.ev - a.ev || b.probability - a.probability)
}

export function evaluateModels(boats: Boat[], context: RaceContext, oddsMap: Record<string, number>) {
  return aiModels.map(model => {
    const predictions = makePredictions(boats, context, model)
    const bets = generateBets(predictions, oddsMap)
    const buyCount = bets.filter(b => b.judgment === '買い候補').length
    const top = predictions[0]
    const maxEv = bets[0]?.ev || 0
    const spread = (predictions[0]?.firstRate || 0) - (predictions[1]?.firstRate || 0)
    const confidence = clamp(top.firstRate * 60 + spread * 120 + Math.min(maxEv, 180) / 6 + buyCount * 2, 0, 100)
    const reason = model.id === 'exhibition' && context.wind >= 5 ? '強風のため展示・直前気配を重視' :
      model.id === 'inside' && context.wind <= 3 ? '風が弱くイン有利を重視' :
      model.id === 'motor' ? '機力差が出やすい前提で評価' :
      model.id === 'value' ? 'オッズ妙味と期待値を重視' : '総合バランスで評価'
    return { model, topLane: top.lane, topName: top.name, topFirstRate: top.firstRate, maxEv, buyCount, confidence, reason }
  }).sort((a, b) => b.confidence - a.confidence)
}

export function chooseSupervisorModel(boats: Boat[], context: RaceContext, oddsMap: Record<string, number>) {
  const evaluated = evaluateModels(boats, context, oddsMap)
  if (context.wind >= 5 || context.wave >= 5) return evaluated.find(e => e.model.id === 'exhibition') || evaluated[0]
  if (context.wind <= 2 && context.wave <= 2) return evaluated.find(e => e.model.id === 'inside') || evaluated[0]
  return evaluated[0]
}

export function summarizeResults(results: SavedResult[]) {
  const stake = results.reduce((s, r) => s + r.stake, 0)
  const payout = results.reduce((s, r) => s + r.payout, 0)
  const hit = results.filter(r => r.hit).length
  return { races: results.length, stake, payout, profit: payout - stake, hitRate: results.length ? hit / results.length : 0, roi: stake ? payout / stake : 0 }
}

export function summarizeByVenue(results: SavedResult[]) {
  const map = new Map<string, { venue: string; races: number; stake: number; payout: number; profit: number; hits: number; roi: number; hitRate: number }>()
  for (const r of results) {
    const row = map.get(r.venue) || { venue: r.venue, races: 0, stake: 0, payout: 0, profit: 0, hits: 0, roi: 0, hitRate: 0 }
    row.races += 1; row.stake += r.stake; row.payout += r.payout; row.profit += r.profit; row.hits += r.hit ? 1 : 0
    row.roi = row.stake ? row.payout / row.stake : 0; row.hitRate = row.races ? row.hits / row.races : 0
    map.set(r.venue, row)
  }
  return [...map.values()].sort((a,b)=>b.profit-a.profit)
}

export function summarizeByModel(results: SavedResult[]) {
  const map = new Map<string, { modelName: string; races: number; stake: number; payout: number; profit: number; hits: number; roi: number; hitRate: number }>()
  for (const r of results) {
    const name = r.modelName || '未記録'
    const row = map.get(name) || { modelName: name, races: 0, stake: 0, payout: 0, profit: 0, hits: 0, roi: 0, hitRate: 0 }
    row.races += 1; row.stake += r.stake; row.payout += r.payout; row.profit += r.profit; row.hits += r.hit ? 1 : 0
    row.roi = row.stake ? row.payout / row.stake : 0; row.hitRate = row.races ? row.hits / row.races : 0
    map.set(name, row)
  }
  return [...map.values()].sort((a,b)=>b.profit-a.profit)
}
