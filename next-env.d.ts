import { Bet, Boat, Prediction, RaceContext, SavedResult } from './types'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export function scoreBoat(boat: Boat, context: RaceContext): number {
  const laneBonus = [0, 24, 12, 7, 3, -3, -8][boat.lane] ?? 0
  const classBonus = boat.className === 'A1' ? 8 : boat.className === 'A2' ? 4 : 0
  const stScore = clamp((0.22 - boat.avgST) * 120, -8, 12)
  const exScore = clamp((6.9 - boat.exhibition) * 45, -8, 10)
  const windPenalty = context.wind >= 5 && boat.lane === 1 ? -5 : 0
  const wavePenalty = context.wave >= 5 && boat.lane >= 5 ? -3 : 0

  return Math.max(1,
    boat.nationalWin * 8 +
    boat.localWin * 5 +
    boat.motorRate * 0.45 +
    boat.boatRate * 0.25 +
    stScore + exScore + laneBonus + classBonus + windPenalty + wavePenalty
  )
}

export function makePredictions(boats: Boat[], context: RaceContext): Prediction[] {
  const scored = boats.map(b => ({ ...b, score: scoreBoat(b, context) }))
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
        bets.push({
          key, first, second, third, probability, odds, ev,
          judgment: ev >= 120 ? '買い候補' : ev >= 100 ? '注意' : '買わない'
        })
      }
    }
  }
  return bets.sort((a, b) => b.ev - a.ev || b.probability - a.probability)
}

export function summarizeResults(results: SavedResult[]) {
  const stake = results.reduce((s, r) => s + r.stake, 0)
  const payout = results.reduce((s, r) => s + r.payout, 0)
  const hit = results.filter(r => r.hit).length
  return {
    races: results.length,
    stake,
    payout,
    profit: payout - stake,
    hitRate: results.length ? hit / results.length : 0,
    roi: stake ? payout / stake : 0
  }
}
