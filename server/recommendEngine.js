const { parseTodayVenues } = require('./parsers');
const { predictRace } = require('./aiEngine');
const { getBestAiRecommendation } = require('./bestAiEngine');

const TODAY_URL = 'https://www.boatrace.jp/owpc/pc/race/index';

function toNumber(value, fallback = 0) {
  const n = Number.parseFloat(String(value ?? '').replace(/[^0-9.+-]/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

function buildReason({ decision, expectedValue, confidence, roughLevel, consensusWithLeagueTop, bestAiName }) {
  const parts = [];
  const pushUnique = (label) => {
    if (label && !parts.includes(label)) {
      parts.push(label);
    }
  };
  if (consensusWithLeagueTop) {
    pushUnique('AI一致');
  }
  if (decision === '買い') {
    pushUnique('買い判断');
  } else if (decision === '少額') {
    pushUnique('少額判断');
  }
  if (expectedValue >= 120) {
    pushUnique('期待値良好');
  }
  if (confidence >= 80) {
    pushUnique('信頼度良好');
  }
  if (/本命|中荒れ/.test(String(roughLevel || ''))) {
    pushUnique('荒れ度適正');
  }
  if (bestAiName && parts.length < 2) {
    pushUnique('AI優先');
  }
  return parts.slice(0, 4).join('・') || '総合評価';
}

function scoreRecommendation({ decision, expectedValue, confidence, roughLevel, consensusWithLeagueTop }) {
  let score = 0;
  if (decision === '買い') score += 45;
  else if (decision === '少額') score += 24;

  score += Math.min(28, Math.max(0, (expectedValue - 90) * 0.7));
  score += Math.min(20, Math.max(0, (confidence - 50) * 0.5));

  if (roughLevel === '本命') score += 10;
  else if (roughLevel === '中荒れ') score += 8;
  else if (roughLevel === '荒れ') score += 3;
  else score -= 4;

  if (consensusWithLeagueTop) score += 14;

  return Math.round(score * 10) / 10;
}

function sortLeagueRows(leagueRows) {
  return [...leagueRows].sort((a, b) => {
    return toNumber(b?.confidence, 0) - toNumber(a?.confidence, 0)
      || toNumber(b?.score, 0) - toNumber(a?.score, 0)
      || toNumber(b?.expectedValue, 0) - toNumber(a?.expectedValue, 0);
  });
}

function toDecisionText(value) {
  const text = String(value || '').trim();
  if (text.includes('買い')) return '買い';
  if (text.includes('少額') || text.includes('注意')) return '少額';
  return text;
}

function buildCandidate({ venueId, venueName, raceNo, prediction, bestAiRecommendation }) {
  const leagueRows = Array.isArray(prediction?.league) ? prediction.league : [];
  const sortedLeagueRows = sortLeagueRows(leagueRows);
  const valueRanking = Array.isArray(prediction?.valueRanking) ? prediction.valueRanking : [];
  const buyableValueRanking = valueRanking.filter((row) => Number(row?.expectedValue || 0) >= 100);
  const bestAiId = String(bestAiRecommendation?.aiId || '');
  const bestAiName = String(bestAiRecommendation?.aiName || '');
  const bestAiRow = sortedLeagueRows.find((row) => String(row?.aiId || '') === bestAiId) || null;
  const chosenRow = bestAiRow || sortedLeagueRows[0] || null;
  const topTicket = Array.isArray(chosenRow?.buyDetails) ? chosenRow.buyDetails[0] || {} : {};
  const topPick = String(chosenRow?.topPick || topTicket?.combo || prediction?.buy?.[0] || '');
  const expectedValue = Math.round(toNumber(chosenRow?.expectedValue, topTicket?.expectedValue || 0) * 10) / 10;
  const confidence = Math.round(toNumber(chosenRow?.confidence, chosenRow?.score || 0) * 10) / 10;
  const roughLevel = String(chosenRow?.roughRace?.roughLevel || prediction?.roughRace?.roughLevel || '');
  const decision = toDecisionText(chosenRow?.decision?.decision || prediction?.decision?.decision || '');
  const topLeagueRows = sortedLeagueRows.filter((row) => String(row?.aiId || '') !== String(chosenRow?.aiId || '')).slice(0, 2);
  const consensusWithLeagueTop = topLeagueRows.some((row) => String(row?.topPick || '') === topPick);
  const topValueTicket = buyableValueRanking[0] || valueRanking[0] || null;
  const valueTopPicks = buyableValueRanking.slice(0, 3);

  const strictMatched =
    consensusWithLeagueTop
    && (decision === '買い' || decision === '少額')
    && expectedValue >= 110
    && (roughLevel === '本命' || roughLevel === '中荒れ')
    && confidence >= 70;

  const totalScore = scoreRecommendation({
    decision,
    expectedValue,
    confidence,
    roughLevel,
    consensusWithLeagueTop
  });

  return {
    venueId,
    venueName,
    raceNo,
    decision,
    bestAi: `${bestAiId || chosenRow?.aiId || '-'} ${bestAiName || chosenRow?.aiName || ''}`.trim(),
    topPick,
    expectedValue,
    confidence,
    roughLevel,
    reason: buildReason({
      decision,
      expectedValue,
      confidence,
      roughLevel,
      consensusWithLeagueTop,
      bestAiName
    }),
    valueRanking,
    valueTopTicket,
    valueTopPicks,
    totalScore,
    strictMatched
  };
}

async function fetchTodayVenues() {
  const response = await fetch(TODAY_URL);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
  return parseTodayVenues(text)
    .filter((venue) => venue?.venueId)
    .filter((venue) => String(venue?.status || '') !== 'cancelled');
}

async function recommendTodayRaces() {
  const bestAiRecommendation = getBestAiRecommendation();
  const venues = await fetchTodayVenues();
  const targetVenues = venues.filter((venue) => venue?.currentRace).length > 0
    ? venues.filter((venue) => venue?.currentRace)
    : venues;

  const tasks = [];
  for (const venue of targetVenues) {
    for (let raceNo = 1; raceNo <= 3; raceNo += 1) {
      tasks.push({ venueId: venue.venueId, venueName: venue.venueName, raceNo: String(raceNo) });
    }
  }

  const predictions = [];
  for (const task of tasks) {
    try {
      const prediction = await predictRace(task.venueId, task.raceNo, { persistLearning: false });
      predictions.push({ ...task, prediction });
    } catch (error) {
      // ignore failed races for recommendation view
    }
  }

  const candidates = predictions
    .map(({ venueId, venueName, raceNo, prediction }) => {
      return buildCandidate({ venueId, venueName, raceNo, prediction, bestAiRecommendation });
    })
    .sort((a, b) => b.totalScore - a.totalScore || b.expectedValue - a.expectedValue || b.confidence - a.confidence);

  const recommendations = candidates
    .filter((row) => row.strictMatched)
    .slice(0, 10)
    .map((row, index) => ({ rank: index + 1, ...row }));

  const fallbackRecommendations = recommendations.length === 0
    ? candidates.slice(0, 3).map((row, index) => ({ rank: index + 1, ...row }))
    : [];

  return {
    recommendations: recommendations.map(({ totalScore, strictMatched, ...row }) => row),
    fallbackRecommendations: fallbackRecommendations.map(({ totalScore, strictMatched, ...row }) => row),
    bestAiRecommendation,
    mode: recommendations.length > 0 ? 'normal' : 'fallback'
  };
}

module.exports = {
  recommendTodayRaces
};