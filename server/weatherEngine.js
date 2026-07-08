function toNumber(value, fallback = 0) {
  const n = Number.parseFloat(String(value ?? '').replace(/[^0-9.+-]/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

function normalizeLane(value) {
  return String(value || '').replace(/[^0-9]/g, '').trim();
}

function parseTicketLanes(ticket) {
  const parts = String(ticket || '').split(/[-/・\s]+/).map((v) => normalizeLane(v)).filter(Boolean);
  return parts.map((v) => Number(v)).filter((v) => Number.isInteger(v) && v > 0 && v <= 6);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function buildOddsLaneBias(odds) {
  const support = new Map();
  for (let lane = 1; lane <= 6; lane += 1) {
    support.set(lane, 0);
  }

  const collections = [odds?.trifecta, odds?.exacta, odds?.quinella, odds?.quinellaPlace];
  for (const rows of collections) {
    if (!Array.isArray(rows)) {
      continue;
    }
    for (const row of rows) {
      const lanes = parseTicketLanes(row?.ticket);
      if (lanes.length === 0) {
        continue;
      }
      const rowOdds = toNumber(row?.odds, 0);
      const weight = rowOdds > 0 ? 1 / rowOdds : 0.001;
      for (const lane of lanes) {
        support.set(lane, (support.get(lane) || 0) + weight);
      }
    }
  }

  const values = Array.from(support.values());
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const result = new Map();

  for (let lane = 1; lane <= 6; lane += 1) {
    const v = support.get(lane) || 0;
    const normalized = range > 0 ? (v - min) / range : 0.5;
    result.set(lane, normalized);
  }

  return result;
}

function buildWeatherContext(beforeInfo, odds) {
  const windSpeed = toNumber(beforeInfo?.windSpeed, 0);
  const waveHeight = toNumber(beforeInfo?.waveHeight, 0);
  const windDirection = String(beforeInfo?.windDirection || '');
  const oddsLaneBias = buildOddsLaneBias(odds);

  return {
    windSpeed,
    waveHeight,
    windDirection,
    oddsLaneBias
  };
}

function laneDirectionFactor(windDirection, lane) {
  const dir = String(windDirection || '');
  if (/向かい/.test(dir)) {
    return lane <= 2 ? 0.95 : lane >= 5 ? 1.05 : 1.0;
  }
  if (/追い|追風/.test(dir)) {
    return lane <= 2 ? 1.06 : lane >= 5 ? 0.94 : 1.0;
  }
  if (/横/.test(dir)) {
    return lane === 1 || lane === 6 ? 0.97 : 1.02;
  }
  return 1.0;
}

function calcWeatherBonus(lane, context) {
  const laneNo = Number(lane) || 0;
  const windSpeed = context?.windSpeed || 0;
  const waveHeight = context?.waveHeight || 0;
  const directionFactor = laneDirectionFactor(context?.windDirection, laneNo);
  const oddsBias = context?.oddsLaneBias?.get(laneNo) ?? 0.5;

  let score = 1.0;

  if (windSpeed >= 6) {
    score += laneNo <= 2 ? -0.45 : laneNo >= 5 ? 0.30 : 0;
  } else if (windSpeed >= 3) {
    score += laneNo <= 2 ? -0.20 : laneNo >= 5 ? 0.12 : 0;
  }

  if (waveHeight >= 8) {
    score += laneNo <= 2 ? -0.30 : laneNo >= 5 ? 0.20 : 0;
  } else if (waveHeight >= 4) {
    score += laneNo <= 2 ? -0.10 : laneNo >= 5 ? 0.06 : 0;
  }

  score *= directionFactor;
  score += (oddsBias - 0.5) * 0.7;

  return clamp(score, 0, 2);
}

module.exports = {
  buildWeatherContext,
  calcWeatherBonus,
  normalizeLane,
  toNumber
};
