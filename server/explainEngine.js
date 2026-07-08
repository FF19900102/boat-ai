const { rateExpectedValue } = require('./expectedValueEngine');
const { toNumber } = require('./weatherEngine');

function toStars(point, maxPoint) {
  const ratio = maxPoint > 0 ? toNumber(point, 0) / maxPoint : 0;
  if (ratio >= 0.9) return '★★★★★';
  if (ratio >= 0.75) return '★★★★☆';
  if (ratio >= 0.6) return '★★★☆☆';
  if (ratio >= 0.45) return '★★☆☆☆';
  return '★☆☆☆☆';
}

function topStrengths(favorite) {
  const candidates = [
    { label: '全国勝率がトップ級', value: favorite?.breakdown?.nationalPoint || 0 },
    { label: '展示タイム評価が高い', value: favorite?.breakdown?.exhibitionPoint || 0 },
    { label: 'ST評価が高い', value: favorite?.breakdown?.stPoint || 0 },
    { label: '当地勝率が高い', value: favorite?.breakdown?.localPoint || 0 },
    { label: 'モーター2連率が高い', value: favorite?.breakdown?.motorPoint || 0 },
    { label: 'ボート2連率が高い', value: favorite?.breakdown?.boatPoint || 0 },
    { label: '枠順の優位が大きい', value: favorite?.breakdown?.lanePoint || 0 }
  ];

  return candidates
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map((item) => item.label);
}

function buildRisks(weatherContext, tickets) {
  const risks = [];
  const windSpeed = toNumber(weatherContext?.windSpeed, 0);
  const waveHeight = toNumber(weatherContext?.waveHeight, 0);
  const windDirection = String(weatherContext?.windDirection || '');
  const bestTicket = Array.isArray(tickets) ? tickets[0] : null;

  if (windSpeed >= 5) {
    risks.push(`${windDirection || '強風'}${windSpeed}m`);
  } else if (windDirection) {
    risks.push(`${windDirection}${windSpeed > 0 ? `${windSpeed}m` : ''}`.trim());
  }

  if (waveHeight >= 5) {
    risks.push(`波高${waveHeight}cm`);
  }

  if (bestTicket && toNumber(bestTicket.expectedValue, 0) < 100) {
    risks.push('オッズが過剰人気');
  }

  if (risks.length === 0) {
    risks.push('大きな不安材料は限定的');
  }

  return risks.slice(0, 3);
}

function buildRecommendation(favorite, tickets) {
  const main = Array.isArray(tickets) && tickets[0] ? tickets[0].combo : '';
  const valueTicket = Array.isArray(tickets) && tickets.length > 1
    ? [...tickets].sort((a, b) => (b.expectedValue || 0) - (a.expectedValue || 0))[0]
    : tickets?.[0] || null;

  if (main && valueTicket && valueTicket.combo && valueTicket.combo !== main) {
    return `本線は${main}。期待値狙いなら${valueTicket.combo}も推奨。`;
  }

  if (main) {
    return `本線は${main}。`;
  }

  return `本線は${favorite ? `${favorite.lane}号艇中心` : '保留'}。`;
}

function buildAnalysis(favorite, weatherContext, tickets) {
  const bestTicket = Array.isArray(tickets) && tickets[0] ? tickets[0] : null;
  return {
    national: toStars(favorite?.breakdown?.nationalPoint, 15),
    exhibition: toStars(favorite?.breakdown?.exhibitionPoint, 20),
    motor: toStars(favorite?.breakdown?.motorPoint, 8),
    wind: toStars(favorite?.breakdown?.weatherPoint, 2),
    expectedValue: bestTicket ? rateExpectedValue(bestTicket.expectedValue) : '★☆☆☆☆'
  };
}

function buildExplanation({ scored, weatherContext, tickets }) {
  const favorite = Array.isArray(scored?.ranked) ? scored.ranked[0] : null;
  if (!favorite) {
    return {
      summary: '有効な採点結果が不足しています。',
      strengths: [],
      risks: ['データ不足'],
      recommendation: '追加データ取得後に再判定してください。',
      analysis: {
        national: '★☆☆☆☆',
        exhibition: '★☆☆☆☆',
        motor: '★☆☆☆☆',
        wind: '★☆☆☆☆',
        expectedValue: '★☆☆☆☆'
      }
    };
  }

  return {
    summary: `${favorite.lane}号艇 ${favorite.racerName}が最も高評価です。`,
    strengths: topStrengths(favorite),
    risks: buildRisks(weatherContext, tickets),
    recommendation: buildRecommendation(favorite, tickets),
    analysis: buildAnalysis(favorite, weatherContext, tickets)
  };
}

module.exports = {
  buildExplanation
};