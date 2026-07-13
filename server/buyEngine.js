const { toNumber } = require('./weatherEngine');
const {
  calculateExpectedValue,
  rateExpectedValue,
  buildOddsMaps,
  buildNormalizedTrifectaProbabilities
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
  const oddsMaps = buildOddsMap(odds);

  const normalized = buildNormalizedTrifectaProbabilities(scoreRows);
  const combos = normalized.rows
    .filter((row) => {
      const lanes = String(row.combo || '').split('-').map((value) => Number(value));
      return lanes.every((lane) => targetLanes.includes(lane));
    })
    .map((row) => {
    const combo = parseTicket(row.combo);
    const probability = clamp(Number(row.probability || 0), 0, 1);
    const officialOdds = oddsMaps.trifecta.get(combo) || 0;
    const evCalculable = officialOdds > 0;
    const expectedValue = evCalculable ? calculateExpectedValue(probability, officialOdds) : 0;
    return {
      combo,
      probability: Math.round(probability * 10000) / 10000,
      odds: Math.round(officialOdds * 10) / 10,
      expectedValue,
      evCalculable,
      oddsSource: evCalculable ? 'official' : 'missing',
      rating: evCalculable ? rateExpectedValue(expectedValue) : '---'
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
    evCalculable: Boolean(row.evCalculable),
    oddsSource: row.oddsSource,
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
