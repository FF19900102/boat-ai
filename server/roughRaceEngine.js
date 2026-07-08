const { toNumber } = require('./weatherEngine');

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function average(values) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values) {
  if (values.length <= 1) {
    return 0;
  }
  const mean = average(values);
  const variance = average(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance);
}

function buildStars(level) {
  if (level === '大荒れ') return '★★★★★';
  if (level === '荒れ') return '★★★★☆';
  if (level === '中荒れ') return '★★★☆☆';
  return '★☆☆☆☆';
}

function buildLevel(score) {
  if (score >= 70) return '大荒れ';
  if (score >= 50) return '荒れ';
  if (score >= 30) return '中荒れ';
  return '本命';
}

function buildComment(level) {
  if (level === '大荒れ') return '大荒れ警戒。穴買い目も検討。';
  if (level === '荒れ') return '荒れ気配。展示と風の影響に注意。';
  if (level === '中荒れ') return '中荒れ注意。2〜4号艇の逆転もあり。';
  return '本命寄りのレース。1号艇中心。';
}

function buildRoughRace({ scoreRows, beforeInfo, odds }) {
  const ranked = [...(Array.isArray(scoreRows) ? scoreRows : [])]
    .sort((a, b) => (b.score || 0) - (a.score || 0) || (a.lane || 0) - (b.lane || 0));

  const lane1 = ranked.find((row) => Number(row.lane) === 1) || null;
  const top = ranked[0] || null;
  const second = ranked[1] || null;
  const otherRows = ranked.filter((row) => Number(row.lane) !== 1);

  const windSpeed = toNumber(beforeInfo?.windSpeed, 0);
  const waveHeight = toNumber(beforeInfo?.waveHeight, 0);
  const exhibitionTimes = Array.isArray(beforeInfo?.entries)
    ? beforeInfo.entries.map((entry) => toNumber(entry?.exhibitionTime, 0)).filter((value) => value > 0)
    : [];
  const trifectaOdds = Array.isArray(odds?.trifecta)
    ? odds.trifecta.map((row) => toNumber(row?.odds, 0)).filter((value) => value > 0)
    : [];

  const topScore = toNumber(top?.score, 0);
  const secondScore = toNumber(second?.score, 0);
  const lane1Score = toNumber(lane1?.score, 0);
  const lane1Gap = otherRows.length > 0
    ? lane1Score - Math.max(...otherRows.map((row) => toNumber(row.score, 0)))
    : lane1Score;
  const topGap = topScore - secondScore;
  const exhibitionSpread = exhibitionTimes.length > 1
    ? Math.max(...exhibitionTimes) - Math.min(...exhibitionTimes)
    : 0;
  const oddsSd = standardDeviation(trifectaOdds);
  const oddsMean = average(trifectaOdds);
  const oddsVarianceRatio = oddsMean > 0 ? oddsSd / oddsMean : 0;

  let roughScore = 0;
  const reasons = [];

  if (topGap <= 3) {
    roughScore += 22;
    reasons.push('1位と2位のスコア差が小さい');
  } else if (topGap <= 6) {
    roughScore += 12;
  } else {
    reasons.push('上位のスコア差があり本命寄り');
  }

  if (lane1 && lane1Gap <= 2) {
    roughScore += 18;
    reasons.push('1号艇と2〜6号艇の差が小さい');
  } else if (lane1 && lane1Gap <= 5) {
    roughScore += 10;
  } else if (lane1) {
    reasons.push('1号艇と他艇の差がある');
  }

  if (windSpeed >= 5) {
    roughScore += 18;
    reasons.push(`風速${windSpeed}m以上`);
  } else if (windSpeed >= 3) {
    roughScore += 8;
  }

  if (waveHeight >= 5) {
    roughScore += 12;
    reasons.push(`波高${waveHeight}cm`);
  } else if (waveHeight >= 3) {
    roughScore += 5;
  }

  if (exhibitionSpread > 0 && exhibitionSpread <= 0.08) {
    roughScore += 14;
    reasons.push('展示タイム差が小さい');
  } else if (exhibitionSpread <= 0.12) {
    roughScore += 7;
  } else if (exhibitionSpread > 0.18) {
    reasons.push('展示タイム差があり本命寄り');
  }

  if (oddsVarianceRatio <= 0.45 && trifectaOdds.length >= 5) {
    roughScore += 16;
    reasons.push('オッズ分散が小さく人気が割れている');
  } else if (oddsVarianceRatio <= 0.65 && trifectaOdds.length >= 5) {
    roughScore += 8;
  }

  roughScore = Math.round(clamp(roughScore, 0, 100));
  const roughLevel = buildLevel(roughScore);

  const filteredReasons = roughScore >= 30
    ? reasons.filter((reason) => /小さい|風速|波高|人気が割れている/.test(reason))
    : reasons.filter((reason) => /本命寄り|差がある/.test(reason));

  return {
    roughScore,
    roughLevel,
    stars: buildStars(roughLevel),
    reasons: (filteredReasons.length ? filteredReasons : reasons).slice(0, 4),
    comment: buildComment(roughLevel)
  };
}

module.exports = {
  buildRoughRace
};