export type Racer = {
  lane: number;
  name: string;
  className: string;
  nationalWin: number;
  localWin: number;
  avgSt: number;
  motorRate: number;
  boatRate: number;
  exhibition: number;
  tilt: number;
  weight: number;
};

export type Weather = { weather: string; windDir: string; windSpeed: number; wave: number };
export type Prediction = Racer & { score: number; p1: number; p2: number; p3: number };
export type Ticket = { combo: string; probability: number; odds: number; ev: number; rank: '買い候補' | '注意' | '買わない' };
export type ResultRecord = { id: string; date: string; venue: string; raceNo: number; result: string; investment: number; payout: number; profit: number; hit: boolean };

export const venues = ['桐生','戸田','江戸川','平和島','多摩川','浜名湖','蒲郡','常滑','津','三国','びわこ','住之江','尼崎','鳴門','丸亀','児島','宮島','徳山','下関','若松','芦屋','福岡','唐津','大村'];

export const createDefaultRacers = (): Racer[] => Array.from({ length: 6 }, (_, i) => ({
  lane: i + 1,
  name: `${i + 1}号艇`,
  className: 'A1',
  nationalWin: [6.5,5.8,5.5,5.1,4.8,4.5][i],
  localWin: [6.2,5.6,5.2,5.0,4.7,4.3][i],
  avgSt: [0.14,0.16,0.15,0.17,0.18,0.19][i],
  motorRate: [38,34,36,31,29,27][i],
  boatRate: [35,33,32,30,28,26][i],
  exhibition: [6.72,6.76,6.74,6.79,6.81,6.83][i],
  tilt: 0,
  weight: [52,53,52,54,53,52][i]
}));

const laneBonus = [18, 8, 4, 0, -4, -8];

export function predict(racers: Racer[], weather: Weather): Prediction[] {
  const minEx = Math.min(...racers.map(r => safe(r.exhibition, 6.8)));
  const windPenalty = Math.max(0, safe(weather.windSpeed, 0) - 4);
  const raw = racers.map(r => {
    const stScore = Math.max(0, (0.25 - safe(r.avgSt, 0.18)) * 120);
    const exScore = Math.max(0, (safe(r.exhibition, 6.9) - minEx) * -45 + 10);
    const score =
      safe(r.nationalWin, 0) * 9 +
      safe(r.localWin, 0) * 5 +
      safe(r.motorRate, 0) * 0.55 +
      safe(r.boatRate, 0) * 0.25 +
      stScore + exScore + laneBonus[r.lane - 1] -
      (r.lane === 1 ? windPenalty * 1.2 : 0) +
      (r.lane >= 4 && windPenalty > 4 ? 2 : 0);
    return { ...r, score: Math.max(1, score) };
  });
  const sum = raw.reduce((a, b) => a + b.score, 0);
  return raw.map(r => {
    const p1 = r.score / sum;
    return { ...r, p1, p2: Math.min(.95, p1 * 1.65), p3: Math.min(.98, p1 * 2.25) };
  }).sort((a,b)=>b.p1-a.p1);
}

export function trifectaTickets(pred: Prediction[], oddsMap: Record<string, number>): Ticket[] {
  const byLane = [...pred].sort((a,b)=>a.lane-b.lane);
  const tickets: Ticket[] = [];
  for (const a of byLane) for (const b of byLane) for (const c of byLane) {
    if (a.lane === b.lane || a.lane === c.lane || b.lane === c.lane) continue;
    const combo = `${a.lane}-${b.lane}-${c.lane}`;
    const probability = a.p1 * (b.p2 / Math.max(.01, 1 - a.p1 * .55)) * (c.p3 / Math.max(.01, 1 - a.p1 * .35 - b.p2 * .25)) * 0.42;
    const odds = oddsMap[combo] || 0;
    const ev = odds > 0 ? probability * odds * 100 : 0;
    tickets.push({ combo, probability, odds, ev, rank: ev >= 120 ? '買い候補' : ev >= 100 ? '注意' : '買わない' });
  }
  return tickets.sort((a,b)=>b.ev-a.ev || b.probability-a.probability);
}

export function formatPct(n: number) { return `${(n * 100).toFixed(1)}%`; }
function safe(n: number, fallback: number) { return Number.isFinite(n) ? n : fallback; }
