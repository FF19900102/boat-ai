const { calculateExpectedValue, buildOddsMaps, estimateFromExacta } = require('./expectedValueEngine');

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeCombo(ticket) {
  return String(ticket || '').replace(/[・\s/]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
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
  for (const row of Array.isArray(scoreRows) ? scoreRows : []) {
    map.set(Number(row?.lane), Math.max(1, Number(row?.score) || 1));
  }
  return map;
}

function comboProbability(combo, strengthMap) {
  const [a, b, c] = String(combo || '').split('-').map((value) => Number(value));
  const lanes = Array.from(strengthMap.keys());
  const sA = strengthMap.get(a) || 1;
  const sB = strengthMap.get(b) || 1;
  const sC = strengthMap.get(c) || 1;
  const total = lanes.reduce((sum, lane) => sum + (strengthMap.get(lane) || 0), 0);
  const remainA = total - sA;
  const remainAB = remainA - sB;

  const p1 = total > 0 ? sA / total : 0;
  const p2 = remainA > 0 ? sB / remainA : 0;
  const p3 = remainAB > 0 ? sC / remainAB : 0;

  return clamp(p1 * p2 * p3, 0, 0.95);
}

function estimateOdds(probability, oddsMaps, combo) {
  return oddsMaps.trifecta.get(combo)
    || estimateFromExacta(combo, oddsMaps.exacta)
    || (probability > 0 ? Math.max(4, Math.min(180, Math.round((0.72 / probability) * 10) / 10)) : 99.9);
}

function buildValueStars(valueRank) {
  const rank = Math.max(1, Math.min(5, Number(valueRank) || 1));
  return `${'★'.repeat(6 - rank)}${'☆'.repeat(rank - 1)}`;
}

function buildValueRanking({ scoreRows, odds }) {
  const lanes = Array.from(new Set((Array.isArray(scoreRows) ? scoreRows : [])
    .map((row) => Number(row?.lane))
    .filter((lane) => lane > 0)))
    .sort((a, b) => a - b);

  if (lanes.length < 3) {
    return [];
  }

  const strengthMap = buildStrengthMap(scoreRows);
  const oddsMaps = buildOddsMaps(odds);

  const ranked = generateTrifecta(lanes)
    .map((combo) => {
      const probability = comboProbability(combo, strengthMap);
      const oddsValue = estimateOdds(probability, oddsMaps, combo);
      const expectedValue = Math.round(calculateExpectedValue(probability, oddsValue));

      return {
        combo: normalizeCombo(combo),
        probability: Math.round(probability * 1000) / 10,
        odds: Math.round(Number(oddsValue || 0) * 10) / 10,
        expectedValue,
        buyable: expectedValue >= 100
      };
    })
    .sort((a, b) => b.expectedValue - a.expectedValue || b.probability - a.probability || b.odds - a.odds)
    .map((row, index) => ({
      ...row,
      valueRank: index + 1,
      valueStars: buildValueStars(index + 1)
    }));

  return ranked;
}

function selectValuePlan(valueRanking) {
  const buyable = Array.isArray(valueRanking) ? valueRanking.filter((row) => Number(row?.expectedValue || 0) >= 100) : [];
  return {
    main: buyable[0] || null,
    reserve: buyable[1] || null,
    hole: buyable[2] || null,
    buyable
  };
}

module.exports = {
  buildValueRanking,
  selectValuePlan,
  buildValueStars
};