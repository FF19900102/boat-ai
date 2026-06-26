import { Boat, Prediction, Trifecta, Weather } from './types';

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function softmax(scores: number[]) {
  const max = Math.max(...scores);
  const exps = scores.map((s) => Math.exp((s - max) / 12));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

export function boatScore(boat: Boat, weather: Weather) {
  const frameBonus = [18, 9, 5, 0, -4, -8][boat.frame - 1] ?? 0;
  const courseBonus = [10, 5, 2, -1, -3, -5][boat.course - 1] ?? 0;
  const stScore = clamp((0.22 - boat.avgSt) * 120, -8, 12);
  const exhibitionScore = clamp((6.9 - boat.exhibition) * 18, -8, 10);
  const windPenalty = weather.windSpeed >= 5 && boat.frame === 1 ? -5 : 0;
  const wavePenalty = weather.wave >= 5 && boat.frame >= 5 ? -3 : 0;

  return (
    boat.nationalRate * 6 +
    boat.localRate * 3 +
    boat.motorRate * 0.35 +
    boat.boatRate * 0.18 +
    stScore +
    exhibitionScore +
    frameBonus +
    courseBonus +
    windPenalty +
    wavePenalty
  );
}

export function predictBoats(boats: Boat[], weather: Weather): Prediction[] {
  const scores = boats.map((b) => boatScore(b, weather));
  const probs = softmax(scores);
  return boats
    .map((boat, i) => {
      const win = probs[i] * 100;
      return {
        ...boat,
        score: Math.round(scores[i] * 10) / 10,
        winRate: Math.round(win * 10) / 10,
        top2Rate: Math.round(clamp(win * 1.72, 5, 86) * 10) / 10,
        top3Rate: Math.round(clamp(win * 2.25, 10, 96) * 10) / 10
      };
    })
    .sort((a, b) => b.winRate - a.winRate);
}

function find(predictions: Prediction[], frame: number) {
  const p = predictions.find((x) => x.frame === frame);
  if (!p) throw new Error('frame not found');
  return p;
}

export function generateTrifecta(predictions: Prediction[]): Trifecta[] {
  const frames = predictions.map((p) => p.frame);
  const rows: Trifecta[] = [];
  for (const first of frames) {
    for (const second of frames) {
      for (const third of frames) {
        if (first === second || first === third || second === third) continue;
        const p1 = find(predictions, first).winRate / 100;
        const p2 = find(predictions, second).top2Rate / 100;
        const p3 = find(predictions, third).top3Rate / 100;
        const probability = Math.max(0.001, p1 * p2 * p3 * 0.78);
        const odds = estimateOdds(probability, first, second, third);
        const ev = probability * odds * 100;
        rows.push({
          key: `${first}-${second}-${third}`,
          first,
          second,
          third,
          probability: Math.round(probability * 10000) / 100,
          odds: Math.round(odds * 10) / 10,
          ev: Math.round(ev),
          rank: ev >= 120 ? '買い候補' : ev >= 100 ? '注意' : '見送り'
        });
      }
    }
  }
  return rows.sort((a, b) => b.ev - a.ev);
}

function estimateOdds(probability: number, first: number, second: number, third: number) {
  const base = 0.75 / probability;
  const outsideBonus = first >= 4 ? 1.25 : first === 1 ? 0.82 : 1;
  const disorder = first > second ? 1.12 : 1;
  const thirdBonus = third >= 5 ? 1.08 : 1;
  return clamp(base * outsideBonus * disorder * thirdBonus, 3, 450);
}

export function verdict(rows: Trifecta[]) {
  const best = rows[0];
  if (!best) return { label: 'データ不足', className: 'skip' };
  if (best.ev >= 120) return { label: `購入候補 ${best.key}`, className: 'buy' };
  if (best.ev >= 100) return { label: `注意 ${best.key}`, className: 'watch' };
  return { label: '見送り推奨', className: 'skip' };
}
