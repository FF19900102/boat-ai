export function scoreBoat(boat) {
  const laneBonus = { 1: 22, 2: 10, 3: 8, 4: 4, 5: -2, 6: -6 }[boat.lane] ?? 0;
  const stScore = Math.max(0, (0.24 - Number(boat.st || 0.2)) * 120);
  const exhibitionScore = Math.max(0, (6.9 - Number(boat.exhibition || 6.9)) * 45);

  return Math.max(
    1,
    Number(boat.winRate || 0) * 8 +
      Number(boat.localRate || 0) * 4 +
      Number(boat.motor || 0) * 0.45 +
      Number(boat.boat || 0) * 0.2 +
      stScore +
      exhibitionScore +
      laneBonus
  );
}

export function predictBoats(boats) {
  const withScore = boats.map((boat) => ({ ...boat, score: scoreBoat(boat) }));
  const total = withScore.reduce((sum, boat) => sum + boat.score, 0);
  return withScore
    .map((boat) => ({
      ...boat,
      firstProb: total ? boat.score / total : 0,
      top2Prob: Math.min(0.95, total ? (boat.score / total) * 1.85 : 0),
      top3Prob: Math.min(0.99, total ? (boat.score / total) * 2.55 : 0),
    }))
    .sort((a, b) => b.firstProb - a.firstProb);
}

export function generateTrifecta(boats) {
  const predicted = predictBoats(boats);
  const map = new Map(predicted.map((b) => [b.lane, b]));
  const tickets = [];

  for (const a of boats) {
    for (const b of boats) {
      for (const c of boats) {
        if (a.lane === b.lane || a.lane === c.lane || b.lane === c.lane) continue;
        const pa = map.get(a.lane)?.firstProb || 0;
        const pb = map.get(b.lane)?.top2Prob || 0;
        const pc = map.get(c.lane)?.top3Prob || 0;
        const probability = pa * pb * pc * 0.85;
        const odds = 10 + (1 / Math.max(probability, 0.001));
        const ev = probability * odds * 100;
        tickets.push({ combo: `${a.lane}-${b.lane}-${c.lane}`, probability, odds, ev });
      }
    }
  }

  return tickets.sort((a, b) => b.ev - a.ev).slice(0, 12);
}
