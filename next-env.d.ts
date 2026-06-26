import { Bet, Boat, Probability, Weather } from './types';

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function scoreBoat(boat: Boat, weather: Weather): number {
  const frameBonus = [18, 10, 6, 2, -3, -7][boat.frame - 1] ?? 0;
  const stScore = clamp((0.25 - boat.avgST) * 85, -5, 14);
  const exhibitScore = clamp((6.95 - boat.exhibition) * 28, -8, 10);
  const windPenalty = boat.frame === 1 && weather.windSpeed >= 5 ? -6 : 0;
  const outBonus = boat.frame >= 4 && weather.windSpeed >= 5 ? 3 : 0;
  return Math.max(
    1,
    boat.nationalRate * 6 +
      boat.localRate * 3.5 +
      boat.motorRate * 0.33 +
      boat.boatRate * 0.16 +
      stScore +
      exhibitScore +
      frameBonus +
      windPenalty +
      outBonus
  );
}

export function probabilities(boats: Boat[], weather: Weather): Probability[] {
  const raw = boats.map((b) => ({ boat: b, score: scoreBoat(b, weather) }));
  const total = raw.reduce((sum, x) => sum + x.score, 0) || 1;
  return raw
    .map(({ boat, score }) => {
      const first = score / total;
      return {
        frame: boat.frame,
        name: boat.name,
        score: Math.round(score * 10) / 10,
        first,
        top2: clamp(first * 1.75, 0, 0.92),
        top3: clamp(first * 2.45, 0, 0.98)
      };
    })
    .sort((a, b) => b.first - a.first);
}

export function trifectaBets(probs: Probability[], oddsMap: Record<string, number>): Bet[] {
  const byFrame = new Map(probs.map((p) => [p.frame, p]));
  const frames = probs.map((p) => p.frame).sort((a, b) => a - b);
  const bets: Bet[] = [];
  for (const a of frames) for (const b of frames) for (const c of frames) {
    if (a === b || b === c || a === c) continue;
    const p1 = byFrame.get(a)!;
    const p2 = byFrame.get(b)!;
    const p3 = byFrame.get(c)!;
    const probability = p1.first * (p2.top2 / 1.9) * (p3.top3 / 2.6);
    const combo = `${a}-${b}-${c}`;
    const odds = oddsMap[combo] || estimatedOdds(probability);
    const ev = probability * odds * 100;
    bets.push({ combo, probability, odds, ev, judge: ev >= 120 ? '買い候補' : ev >= 100 ? '注意' : '見送り' });
  }
  return bets.sort((a, b) => b.ev - a.ev);
}

function estimatedOdds(probability: number) {
  return Math.round(clamp((0.72 / Math.max(probability, 0.001)), 2.5, 250) * 10) / 10;
}
