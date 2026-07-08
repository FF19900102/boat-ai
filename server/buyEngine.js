const { toNumber } = require('./weatherEngine');
const {
  calculateExpectedValue,
  rateExpectedValue,
  buildOddsMaps,
  estimateFromExacta
} = require('./expectedValueEngine');

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parseTicket(ticket) {
  return String(ticket || '').replace(/[・\s/]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function buildOddsMap(odds) {
  return buildOddsMaps(odds);
}

function generateTrifecta(lanes) {
  const combos = [];
  for (const a of lanes) {
    for (const b of lanes) {
      for (const c of lanes) {
        if (a === b || a === c || b === c) {
          continue;
        }
        combos.push(`${a}-${b}-${c}`);
      }
    }
  }
  return combos;
}

function buildStrengthMap(scoreRows) {
  const map = new Map();
  for (const row of scoreRows) {
    map.set(Number(row.lane), Math.max(1, Number(row.score) || 1));
  }
  return map;
}

function comboProbability(combo, strengthMap) {
  const [a, b, c] = combo.split('-').map((x) => Number(x));
  const allLanes = Array.from(strengthMap.keys());
  const sA = strengthMap.get(a) || 1;
  const sB = strengthMap.get(b) || 1;
  const sC = strengthMap.get(c) || 1;
  const total = allLanes.reduce((sum, lane) => sum + (strengthMap.get(lane) || 0), 0);
  const remainA = total - sA;
  const remainAB = remainA - sB;

  const p1 = total > 0 ? sA / total : 0;
  const p2 = remainA > 0 ? sB / remainA : 0;
  const p3 = remainAB > 0 ? sC / remainAB : 0;

  return clamp(p1 * p2 * p3, 0, 0.95);
}

function estimateOdds(probability) {
  if (probability <= 0) {
    return 99.9;
  }
  const raw = 0.72 / probability;
  return Math.max(4, Math.min(180, Math.round(raw * 10) / 10));
}

function pickUnique(source, count, selected) {
  const result = [];
  for (const item of source) {
    if (result.length >= count) {
      break;
    }
    if (selected.has(item.combo)) {
      continue;
    }
    selected.add(item.combo);
    result.push(item);
  }
  return result;
}

function buildBuyPlan({ ranked, scoreRows, odds }) {
  const ordered = Array.isArray(ranked) && ranked.length > 0 ? ranked : scoreRows;
  const lanesByRank = ordered.map((r) => Number(r.lane)).filter((lane) => lane > 0);
  const targetLanes = lanesByRank.length > 0 ? lanesByRank.slice(0, 5) : [1, 2, 3, 4, 5];

  const strengthMap = buildStrengthMap(scoreRows);
  const oddsMaps = buildOddsMap(odds);

  const combos = generateTrifecta(targetLanes).map((combo) => {
    const probability = comboProbability(combo, strengthMap);
    const oddsValue = oddsMaps.trifecta.get(combo)
      || estimateFromExacta(combo, oddsMaps.exacta)
      || estimateOdds(probability);
    const expectedValue = calculateExpectedValue(probability, oddsValue);
    return {
      combo,
      probability: Math.round(probability * 10000) / 10000,
      odds: Math.round(oddsValue * 10) / 10,
      expectedValue,
      rating: rateExpectedValue(expectedValue)
    };
  }).sort((a, b) => b.probability - a.probability || b.expectedValue - a.expectedValue);

  const selected = new Set();

  const mainCandidates = combos.filter((c) => {
    const [a, b] = c.combo.split('-').map((v) => Number(v));
    return a === targetLanes[0] || b === targetLanes[0];
  });
  const main = pickUnique(mainCandidates, 3, selected).map((row) => ({ ...row, type: 'main' }));

  const reserveCandidates = combos.filter((c) => {
    const lanes = c.combo.split('-').map((v) => Number(v));
    return lanes.every((lane) => targetLanes.slice(0, 4).includes(lane));
  });
  const reserve = pickUnique(reserveCandidates, 5, selected).map((row) => ({ ...row, type: 'reserve' }));

  const holeAnchor = targetLanes[3] || targetLanes[targetLanes.length - 1];
  const holeCandidates = combos.filter((c) => c.combo.includes(String(holeAnchor)));
  const holeSorted = [...holeCandidates].sort((a, b) => b.expectedValue - a.expectedValue || b.odds - a.odds);
  const hole = pickUnique(holeSorted, 3, selected).map((row) => ({ ...row, type: 'hole' }));

  const tickets = [...main, ...reserve, ...hole].map((row, idx) => ({
    rank: idx + 1,
    type: row.type,
    combo: row.combo,
    odds: row.odds,
    probability: row.probability,
    expectedValue: row.expectedValue,
    rating: row.rating
  }));

  return {
    buy: tickets.map((t) => t.combo),
    tickets
  };
}

module.exports = {
  buildBuyPlan
};
