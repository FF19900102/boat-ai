const { calculateExpectedValue, buildOddsMaps, normalizeTicket, buildNormalizedTrifectaProbabilities } = require('./expectedValueEngine');

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function buildValueStars(valueRank) {
  const rank = Math.max(1, Math.min(5, Number(valueRank) || 1));
  return `${'★'.repeat(6 - rank)}${'☆'.repeat(rank - 1)}`;
}

function buildValueRanking({ scoreRows, odds }) {
  if (!Array.isArray(scoreRows) || scoreRows.length < 3) {
    return [];
  }

  const oddsMaps = buildOddsMaps(odds);
  const normalized = buildNormalizedTrifectaProbabilities(scoreRows);

  const ranked = normalized.rows
    .map((row) => {
      const combo = normalizeTicket(row.combo);
      const probability = clamp(Number(row.probability || 0), 0, 1);
      const oddsValue = Number(oddsMaps.trifecta.get(combo) || 0);
      const evCalculable = oddsValue > 0;
      const expectedValue = evCalculable ? Math.round(calculateExpectedValue(probability, oddsValue)) : 0;

      return {
        combo,
        probability: Math.round(probability * 100000) / 1000,
        odds: Math.round(Number(oddsValue || 0) * 10) / 10,
        expectedValue,
        buyable: evCalculable && expectedValue >= 100,
        evCalculable,
        oddsSource: evCalculable ? 'official' : 'missing'
      };
    })
    .sort((a, b) => Number(b.evCalculable) - Number(a.evCalculable) || b.expectedValue - a.expectedValue || b.probability - a.probability || b.odds - a.odds)
    .map((row, index) => ({
      ...row,
      valueRank: index + 1,
      valueStars: row.evCalculable ? buildValueStars(index + 1) : '---'
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