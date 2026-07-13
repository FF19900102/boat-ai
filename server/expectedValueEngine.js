const { toNumber } = require('./weatherEngine');

function normalizeTicket(ticket) {
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
    const lane = Number(row?.lane || 0);
    if (lane <= 0) {
      continue;
    }
    map.set(lane, Math.max(1, Number(row?.score) || 1));
  }
  return map;
}

function rawComboProbability(combo, strengthMap) {
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
  return Math.max(0, Math.min(1, p1 * p2 * p3));
}

function buildNormalizedTrifectaProbabilities(scoreRows) {
  const lanes = [1, 2, 3, 4, 5, 6];
  const strengthMap = buildStrengthMap(scoreRows);
  for (const lane of lanes) {
    if (!strengthMap.has(lane)) {
      strengthMap.set(lane, 1);
    }
  }

  const rows = generateTrifecta(lanes).map((combo) => ({
    combo,
    rawProbability: rawComboProbability(combo, strengthMap)
  }));

  const rawTotal = rows.reduce((sum, row) => sum + row.rawProbability, 0);
  const normalizedRows = rows.map((row) => ({
    combo: row.combo,
    probability: rawTotal > 0 ? row.rawProbability / rawTotal : 0
  }));
  const total = normalizedRows.reduce((sum, row) => sum + row.probability, 0);

  return {
    rows: normalizedRows,
    totalProbability: total,
    comboCount: normalizedRows.length
  };
}

function calculateExpectedValue(probability, odds) {
  const p = toNumber(probability, 0);
  const o = toNumber(odds, 0);
  return Math.round(p * o * 1000) / 10;
}

function rateExpectedValue(expectedValue) {
  const ev = toNumber(expectedValue, 0);
  if (ev >= 130) return '★★★★★';
  if (ev >= 110) return '★★★★☆';
  if (ev >= 100) return '★★★☆☆';
  if (ev >= 90) return '★★☆☆☆';
  return '★☆☆☆☆';
}

function buildOddsMaps(odds) {
  const trifecta = new Map();
  const exacta = new Map();

  for (const row of Array.isArray(odds?.trifecta) ? odds.trifecta : []) {
    const ticket = normalizeTicket(row?.ticket || '');
    const value = toNumber(row?.odds, 0);
    if (ticket && value > 0) {
      trifecta.set(ticket, value);
    }
  }

  for (const row of Array.isArray(odds?.exacta) ? odds.exacta : []) {
    const ticket = normalizeTicket(row?.ticket || '');
    const value = toNumber(row?.odds, 0);
    if (ticket && value > 0) {
      exacta.set(ticket, value);
    }
  }

  return { trifecta, exacta };
}

function estimateFromExacta(combo, exactaMap) {
  const [first, second] = String(combo || '').split('-');
  const key = [first, second].filter(Boolean).join('-');
  const exactaOdds = exactaMap.get(key);
  if (!exactaOdds) {
    return 0;
  }
  return Math.round(exactaOdds * 1.8 * 10) / 10;
}

module.exports = {
  calculateExpectedValue,
  rateExpectedValue,
  buildOddsMaps,
  estimateFromExacta,
  normalizeTicket,
  buildNormalizedTrifectaProbabilities
};