import { Boat, Ticket, Weather } from './types';

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function scoreBoat(boat: Boat, weather: Weather): number {
  const frameBonus = [0, 24, 12, 8, 3, -3, -8][boat.frame] ?? 0;
  const courseBonus = [0, 12, 7, 5, 1, -3, -7][boat.course] ?? 0;
  const classBonus = boat.className === 'A1' ? 10 : boat.className === 'A2' ? 5 : 0;
  const stScore = clamp((0.24 - boat.avgST) * 120, -8, 14);
  const exhibitionScore = clamp((6.95 - boat.exhibition) * 28, -8, 10);
  const motorScore = (boat.motorRate - 30) * 0.35;
  const boatScore = (boat.boatRate - 30) * 0.18;
  const winScore = boat.nationalWin * 7 + boat.localWin * 3.5;
  const windPenalty = weather.windSpeed >= 5 && boat.frame === 1 ? -8 : 0;
  const wavePenalty = weather.wave >= 5 && boat.frame >= 5 ? -5 : 0;

  return Math.max(1, winScore + motorScore + boatScore + stScore + exhibitionScore + frameBonus + courseBonus + classBonus + windPenalty + wavePenalty);
}

export function winProbabilities(boats: Boat[], weather: Weather): Record<number, number> {
  const scores = boats.map((b) => ({ frame: b.frame, score: scoreBoat(b, weather) }));
  const total = scores.reduce((s, b) => s + b.score, 0) || 1;
  return Object.fromEntries(scores.map((b) => [b.frame, b.score / total]));
}

export function top3Probabilities(boats: Boat[], weather: Weather) {
  const win = winProbabilities(boats, weather);
  return boats.map((b) => {
    const p1 = win[b.frame] ?? 0;
    const place2 = clamp(p1 * 1.7 + (b.frame <= 3 ? 0.12 : 0.05), 0.04, 0.86);
    const place3 = clamp(p1 * 2.25 + (b.frame <= 3 ? 0.22 : 0.1), 0.08, 0.94);
    return { ...b, score: scoreBoat(b, weather), p1, p2: place2, p3: place3 };
  }).sort((a, b) => b.p1 - a.p1);
}

function comboProbability(a: number, b: number, c: number, win: Record<number, number>) {
  const pA = win[a] ?? 0;
  const restB = 1 - pA;
  const pB = restB > 0 ? (win[b] ?? 0) / restB : 0;
  const restC = 1 - pA - (win[b] ?? 0);
  const pC = restC > 0 ? (win[c] ?? 0) / restC : 0;
  return pA * pB * pC * 0.78;
}

export function generateTickets(boats: Boat[], weather: Weather, oddsMap: Record<string, number> = {}): Ticket[] {
  const frames = boats.map((b) => b.frame);
  const win = winProbabilities(boats, weather);
  const tickets: Ticket[] = [];

  for (const a of frames) {
    for (const b of frames) {
      for (const c of frames) {
        if (a === b || a === c || b === c) continue;
        const combo = `${a}-${b}-${c}`;
        const probability = comboProbability(a, b, c, win);
        const estimatedOdds = oddsMap[combo] || Math.max(5, Math.round((0.74 / Math.max(probability, 0.001)) * 10) / 10);
        const ev = probability * estimatedOdds * 100;
        const label = ev >= 120 ? '買い候補' : ev >= 100 ? '注意' : '見送り';
        tickets.push({ combo, probability, odds: estimatedOdds, ev, label });
      }
    }
  }

  return tickets.sort((a, b) => b.ev - a.ev);
}

export function judgeRace(tickets: Ticket[]) {
  const buy = tickets.filter((t) => t.ev >= 120);
  if (buy.length === 0) return '見送り推奨';
  if (buy[0].ev >= 150) return '強め買い候補';
  return '買い候補あり';
}
