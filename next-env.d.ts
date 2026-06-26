import { Boat, Prediction, Trifecta, Weather } from './types';

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }
function round(n: number, d = 1) { return Math.round(n * Math.pow(10,d)) / Math.pow(10,d); }

export function calculatePredictions(boats: Boat[], weather: Weather): Prediction[] {
  const base = boats.map((b) => {
    const frameBonus = [22, 10, 5, 0, -6, -10][b.frame - 1] ?? 0;
    const rate = b.nationalRate * 10 + b.localRate * 5;
    const motor = b.motorRate * 0.75 + b.boatRate * 0.35;
    const st = clamp((0.22 - b.avgSt) * 180, -8, 18);
    const exhibition = clamp((6.9 - b.exhibition) * 35, -8, 12);
    const wind = weather.windSpeed >= 5 ? (b.frame === 1 ? -6 : b.frame >= 3 ? 3 : 0) : 0;
    const wave = weather.wave >= 5 ? (b.frame >= 4 ? 2 : -1) : 0;
    const classBonus = b.className === 'A1' ? 8 : b.className === 'A2' ? 3 : 0;
    const score = Math.max(5, rate + motor + st + exhibition + frameBonus + wind + wave + classBonus);
    return { frame: b.frame, racer: b.racer, score };
  });

  const total = base.reduce((s, x) => s + x.score, 0) || 1;
  return base.map((x) => {
    const win = x.score / total * 100;
    return {
      ...x,
      score: round(x.score, 1),
      win: round(win, 1),
      top2: round(clamp(win * 1.65, 5, 92), 1),
      top3: round(clamp(win * 2.25, 8, 98), 1)
    };
  }).sort((a,b) => b.win - a.win);
}

function permutation(arr: number[]): number[][] {
  const out: number[][] = [];
  for (const a of arr) for (const b of arr) for (const c of arr) {
    if (a !== b && a !== c && b !== c) out.push([a,b,c]);
  }
  return out;
}

export function buildTrifectas(preds: Prediction[], oddsMap: Record<string, number>): Trifecta[] {
  const by = new Map(preds.map(p => [p.frame, p]));
  const combos = permutation([1,2,3,4,5,6]);
  return combos.map(([a,b,c]) => {
    const pa = (by.get(a)?.win ?? 0) / 100;
    const pb = (by.get(b)?.top2 ?? 0) / 100;
    const pc = (by.get(c)?.top3 ?? 0) / 100;
    const probability = clamp(pa * pb * pc * 100 * 1.25, 0.01, 35);
    const key = `${a}-${b}-${c}`;
    const odds = oddsMap[key] || autoOdds(probability);
    const ev = probability / 100 * odds * 100;
    return { combo: key, probability: round(probability, 2), odds: round(odds, 1), ev: round(ev, 1), decision: ev >= 120 ? '買い候補' : ev >= 100 ? '注意' : '買わない' };
  }).sort((a,b) => b.ev - a.ev);
}

function autoOdds(prob: number) {
  const fair = 100 / Math.max(prob, 0.1);
  return clamp(fair * 0.75 + Math.random() * 12, 3, 180);
}

export function modelScores() {
  return [
    { name: 'イン重視AI', roi: 103, hit: 31 },
    { name: '展示重視AI', roi: 116, hit: 28 },
    { name: 'モーター重視AI', roi: 98, hit: 25 },
    { name: '期待値AI', roi: 128, hit: 18 },
    { name: '総合AI', roi: 120, hit: 29 }
  ];
}
