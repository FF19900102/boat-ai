export type Boat = {
  frame: number;
  name: string;
  className: string;
  nationalWin: number;
  localWin: number;
  st: number;
  motorRate: number;
  boatRate: number;
  exhibition: number;
  tilt: number;
  weight: number;
  entry: number;
};

export type Weather = { weather: string; windDir: string; wind: number; wave: number };
export type Prediction = Boat & { score: number; first: number; top2: number; top3: number };
export type Ticket = { key: string; first: number; second: number; third: number; probability: number; odds: number; ev: number; judge: string };

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export function defaultBoats(): Boat[] {
  return [1,2,3,4,5,6].map((frame) => ({
    frame,
    name: `${frame}号艇`,
    className: frame <= 2 ? 'A1' : frame <= 4 ? 'A2' : 'B1',
    nationalWin: [6.5,5.8,5.5,5.2,4.8,4.5][frame-1],
    localWin: [6.2,5.6,5.4,5.0,4.7,4.3][frame-1],
    st: [0.14,0.16,0.15,0.17,0.18,0.19][frame-1],
    motorRate: [38,34,36,31,30,28][frame-1],
    boatRate: [35,32,34,30,29,27][frame-1],
    exhibition: [6.72,6.76,6.74,6.78,6.81,6.84][frame-1],
    tilt: 0,
    weight: [52,53,52,54,53,55][frame-1],
    entry: frame
  }));
}

export function scoreBoat(b: Boat, w: Weather): number {
  const frameBonus: Record<number, number> = {1: 22, 2: 8, 3: 5, 4: 1, 5: -4, 6: -8};
  const entryBonus = b.entry === 1 ? 8 : b.entry === 2 ? 3 : b.entry === 3 ? 1 : b.entry >= 5 ? -3 : 0;
  const stScore = clamp((0.24 - b.st) * 90, -8, 14);
  const exScore = clamp((6.95 - b.exhibition) * 28, -8, 10);
  const motorScore = (b.motorRate - 30) * 0.28;
  const boatScore = (b.boatRate - 30) * 0.14;
  const winScore = b.nationalWin * 6 + b.localWin * 3;
  const classBonus = b.className === 'A1' ? 7 : b.className === 'A2' ? 3 : b.className === 'B1' ? -1 : -4;
  const windPenalty = w.wind >= 5 && b.frame === 1 ? -5 : w.wind >= 5 && b.frame >= 4 ? 3 : 0;
  const wavePenalty = w.wave >= 5 && b.frame >= 5 ? -2 : 0;
  return Math.max(1, winScore + stScore + exScore + motorScore + boatScore + classBonus + (frameBonus[b.frame] || 0) + entryBonus + windPenalty + wavePenalty);
}

export function makePredictions(boats: Boat[], weather: Weather): Prediction[] {
  const raw = boats.map((b) => ({...b, score: scoreBoat(b, weather)}));
  const total = raw.reduce((s, b) => s + b.score, 0) || 1;
  return raw.map((b) => {
    const first = b.score / total;
    return {...b, first, top2: clamp(first * 1.75, 0, .92), top3: clamp(first * 2.35, 0, .98)};
  }).sort((a,b) => b.first - a.first);
}

export function generateTickets(predictions: Prediction[], oddsMap: Record<string, number> = {}): Ticket[] {
  const byFrame = [...predictions].sort((a,b) => a.frame - b.frame);
  const tickets: Ticket[] = [];
  for (const a of byFrame) for (const b of byFrame) for (const c of byFrame) {
    if (a.frame === b.frame || a.frame === c.frame || b.frame === c.frame) continue;
    const key = `${a.frame}-${b.frame}-${c.frame}`;
    const rest2 = Math.max(0.01, 1 - a.first);
    const secondProb = (b.top2 - b.first * 0.35) / rest2;
    const rest3 = Math.max(0.01, 1 - a.first - b.first * 0.55);
    const thirdProb = (c.top3 - c.top2 * 0.32) / rest3;
    const probability = clamp(a.first * clamp(secondProb, .01, .75) * clamp(thirdProb, .01, .65), 0.0001, 0.35);
    const odds = oddsMap[key] || 0;
    const ev = odds > 0 ? probability * odds * 100 : 0;
    const judge = odds === 0 ? 'オッズ待ち' : ev >= 120 ? '買い候補' : ev >= 100 ? '注意' : '見送り';
    tickets.push({key, first:a.frame, second:b.frame, third:c.frame, probability, odds, ev, judge});
  }
  return tickets.sort((a,b) => b.ev - a.ev || b.probability - a.probability);
}

export function ticketHit(ticketKey: string, result: string) {
  return ticketKey.replaceAll(' ', '') === result.replaceAll(' ', '');
}
