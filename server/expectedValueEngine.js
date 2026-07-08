const { toNumber } = require('./weatherEngine');

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
    const ticket = String(row?.ticket || '').replace(/[・\s/]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const value = toNumber(row?.odds, 0);
    if (ticket && value > 0) {
      trifecta.set(ticket, value);
    }
  }

  for (const row of Array.isArray(odds?.exacta) ? odds.exacta : []) {
    const ticket = String(row?.ticket || '').replace(/[・\s/]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
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
  estimateFromExacta
};