export type Venue = { id: string; name: string; night?: boolean };
export type Racer = {
  lane: number;
  name: string;
  className: string;
  nationalRate: number;
  localRate: number;
  st: number;
  motorRate: number;
  boatRate: number;
  exhibition: number;
  tilt: number;
  weight: number;
  oddsWin?: number;
};
export type RaceResult = {
  order: string;
  payout: number;
  betAmount: number;
  hit: boolean;
  profit: number;
};
export type Ticket = {
  key: string;
  probability: number;
  odds: number;
  ev: number;
  rank: "買い候補" | "注意" | "見送り";
};

export const venues: Venue[] = [
  { id: "kiryu", name: "桐生", night: true },
  { id: "toda", name: "戸田" },
  { id: "edogawa", name: "江戸川" },
  { id: "heiwajima", name: "平和島" },
  { id: "tamagawa", name: "多摩川" },
  { id: "hamanako", name: "浜名湖" },
  { id: "gamagori", name: "蒲郡", night: true },
  { id: "tokoname", name: "常滑" },
  { id: "tsu", name: "津" },
  { id: "mikuni", name: "三国" },
  { id: "biwako", name: "びわこ" },
  { id: "suminoe", name: "住之江", night: true },
  { id: "amagasaki", name: "尼崎" },
  { id: "naruto", name: "鳴門" },
  { id: "marugame", name: "丸亀", night: true },
  { id: "kojima", name: "児島" },
  { id: "miyajima", name: "宮島" },
  { id: "tokuyama", name: "徳山" },
  { id: "shimonoseki", name: "下関", night: true },
  { id: "wakamatsu", name: "若松", night: true },
  { id: "ashiya", name: "芦屋" },
  { id: "fukuoka", name: "福岡" },
  { id: "karatsu", name: "唐津" },
  { id: "omura", name: "大村", night: true }
];

export const defaultRacers: Racer[] = [1,2,3,4,5,6].map((lane) => ({
  lane,
  name: `${lane}号艇`,
  className: lane <= 2 ? "A1" : lane <= 4 ? "A2" : "B1",
  nationalRate: lane === 1 ? 6.8 : 6.2 - lane * 0.25,
  localRate: lane === 1 ? 6.5 : 5.9 - lane * 0.22,
  st: 0.13 + lane * 0.01,
  motorRate: 42 - lane * 2,
  boatRate: 38 - lane,
  exhibition: 6.72 + lane * 0.02,
  tilt: 0,
  weight: lane === 6 ? 53 : 52,
  oddsWin: lane === 1 ? 1.6 : lane * 3.2
}));

function laneBonus(lane: number) {
  return [0, 18, 8, 3, -2, -6, -10][lane] ?? 0;
}

export function scoreRacer(r: Racer) {
  const stScore = Math.max(0, (0.22 - r.st) * 100);
  const exScore = Math.max(0, (6.95 - r.exhibition) * 35);
  return (
    r.nationalRate * 8 +
    r.localRate * 5 +
    r.motorRate * 0.45 +
    r.boatRate * 0.2 +
    stScore +
    exScore +
    laneBonus(r.lane)
  );
}

export function probabilities(racers: Racer[]) {
  const scores = racers.map((r) => Math.max(1, scoreRacer(r)));
  const total = scores.reduce((a,b) => a + b, 0);
  return racers.map((r, i) => ({
    ...r,
    score: scores[i],
    first: scores[i] / total,
    top2: Math.min(0.95, (scores[i] / total) * 1.75),
    top3: Math.min(0.98, (scores[i] / total) * 2.35)
  })).sort((a,b) => b.first - a.first);
}

export function trifectaTickets(racers: Racer[], oddsMap: Record<string, number> = {}): Ticket[] {
  const probs = probabilities(racers);
  const p = new Map(probs.map(x => [x.lane, x.first]));
  const lanes = racers.map(r => r.lane);
  const tickets: Ticket[] = [];
  for (const a of lanes) for (const b of lanes) for (const c of lanes) {
    if (a === b || b === c || a === c) continue;
    const pa = p.get(a) ?? 0;
    const pb = p.get(b) ?? 0;
    const pc = p.get(c) ?? 0;
    const probability = pa * (pb / Math.max(0.01, 1 - pa)) * (pc / Math.max(0.01, 1 - pa - pb)) * 0.9;
    const key = `${a}-${b}-${c}`;
    const odds = oddsMap[key] ?? estimateOdds(probability);
    const ev = probability * odds * 100;
    tickets.push({ key, probability, odds, ev, rank: ev >= 120 ? "買い候補" : ev >= 100 ? "注意" : "見送り" });
  }
  return tickets.sort((a,b) => b.ev - a.ev);
}

function estimateOdds(prob: number) {
  return Math.max(3, Math.round((0.72 / Math.max(prob, 0.002)) * 10) / 10);
}

export function summarize(results: RaceResult[]) {
  const bet = results.reduce((s,r) => s + r.betAmount, 0);
  const payout = results.reduce((s,r) => s + r.payout, 0);
  return {
    races: results.length,
    hits: results.filter(r => r.hit).length,
    bet,
    payout,
    profit: payout - bet,
    hitRate: results.length ? results.filter(r => r.hit).length / results.length : 0,
    returnRate: bet ? payout / bet : 0
  };
}
