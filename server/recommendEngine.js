const { parseTodayVenues } = require('./parsers');
const { predictRace } = require('./aiEngine');
const { getBestAiRecommendation } = require('./bestAiEngine');

const TODAY_URL = 'https://www.boatrace.jp/owpc/pc/race/index';

function normalizeDate(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length === 8 ? digits : '';
}

function getTomorrowDateJst() {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const jst = new Date(utcMs + 9 * 60 * 60000 + 24 * 60 * 60000);
  const yyyy = jst.getFullYear();
  const mm = String(jst.getMonth() + 1).padStart(2, '0');
  const dd = String(jst.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

function getTodayDateJst() {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const jst = new Date(utcMs + 9 * 60 * 60000);
  const yyyy = jst.getFullYear();
  const mm = String(jst.getMonth() + 1).padStart(2, '0');
  const dd = String(jst.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

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
  const chosenBuyDetails = Array.isArray(chosenRow?.buyDetails) ? chosenRow.buyDetails : [];
  const predictionBuyDetails = Array.isArray(prediction?.buyDetails) ? prediction.buyDetails : [];
  const topTicket = chosenBuyDetails[0] || predictionBuyDetails[0] || {};
  const valueTopTicket = buyableValueRanking[0] || valueRanking[0] || topTicket || null;
  const topPick = String(chosenRow?.topPick || valueTopTicket?.combo || topTicket?.combo || prediction?.buy?.[0] || '');
  const expectedValue = Math.round(toNumber(chosenRow?.expectedValue, topTicket?.expectedValue || 0) * 10) / 10;
  const confidence = Math.round(toNumber(chosenRow?.confidence, chosenRow?.score || 0) * 10) / 10;
  const roughLevel = String(chosenRow?.roughRace?.roughLevel || prediction?.roughRace?.roughLevel || '');
  const decision = toDecisionText(chosenRow?.decision?.decision || prediction?.decision?.decision || '');
  const topLeagueRows = sortedLeagueRows.filter((row) => String(row?.aiId || '') !== String(chosenRow?.aiId || '')).slice(0, 2);
  const consensusWithLeagueTop = topLeagueRows.some((row) => String(row?.topPick || '') === topPick);
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

async function fetchVenuesByDate(targetDate) {
  const date = normalizeDate(targetDate);
  const url = date ? `${TODAY_URL}?hd=${date}` : TODAY_URL;
  const response = await fetch(url);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
  return parseTodayVenues(text)
    .filter((venue) => venue?.venueId)
    .filter((venue) => String(venue?.status || '') !== 'cancelled');
}

async function recommendRacesByDate(targetDate) {
  const date = normalizeDate(targetDate) || getTodayDateJst();
  const bestAiRecommendation = getBestAiRecommendation();
  const venues = await fetchVenuesByDate(date);

  if (!venues.length) {
    const isTomorrow = date === getTomorrowDateJst();
    return {
      recommendations: [],
      fallbackRecommendations: [],
      bestAiRecommendation,
      mode: isTomorrow ? 'unpublished' : 'no-race',
      statusMessage: isTomorrow ? '明日の出走表はまだ公開されていません' : '今日は勝負レースなし'
    };
  }

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
      const prediction = await predictRace(task.venueId, task.raceNo, {
        persistLearning: false,
        targetDate: date
      });
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

  // If parsing/prediction failed for all races but venues exist, expose lightweight reference rows.
  const safeCandidates = candidates.length > 0
    ? candidates
    : tasks.slice(0, 3).map((task) => ({
        venueId: task.venueId,
        venueName: task.venueName,
        raceNo: task.raceNo,
        decision: '参考候補',
        bestAi: `${bestAiRecommendation?.aiId || '-'} ${bestAiRecommendation?.aiName || ''}`.trim(),
        topPick: '',
        expectedValue: 0,
        confidence: 0,
        roughLevel: '',
        reason: '開催レースあり（参考候補）',
        valueRanking: [],
        valueTopTicket: null,
        valueTopPicks: []
      }));

  const buyRows = safeCandidates.filter((row) => row?.decision === '買い');
  const smallRows = safeCandidates.filter((row) => row?.decision === '少額');

  let selectedRows = [];
  let mode = 'no-race';
  let statusMessage = '今日は勝負レースなし';

  if (safeCandidates.length === 0) {
    mode = 'no-race';
    statusMessage = '今日は勝負レースなし';
  } else if (buyRows.length > 0) {
    selectedRows = buyRows.slice(0, 10);
    mode = 'buy';
    statusMessage = '買い判定レースを表示';
  } else if (smallRows.length > 0) {
    selectedRows = smallRows.slice(0, 10);
    mode = 'small';
    statusMessage = '積極的に買うレースはありません';
  } else {
    selectedRows = [...safeCandidates]
      .sort((a, b) => b.expectedValue - a.expectedValue || b.confidence - a.confidence)
      .slice(0, 3)
      .map((row) => ({
        ...row,
        decision: row?.decision || '参考候補',
        reason: row?.reason || '期待値上位の参考候補'
      }));
    mode = 'reference';
    statusMessage = '積極的に買うレースはありません';
  }

  const recommendations = selectedRows
    .map((row, index) => ({ rank: index + 1, ...row }));

  // Keep compatibility: fallbackRecommendations remains present.
  const fallbackRecommendations = mode === 'reference'
    ? recommendations
    : [];

  return {
    recommendations: recommendations.map(({ totalScore, strictMatched, ...row }) => row),
    fallbackRecommendations: fallbackRecommendations.map(({ totalScore, strictMatched, ...row }) => row),
    bestAiRecommendation,
    mode,
    statusMessage
  };
}

async function recommendTodayRaces() {
  return recommendRacesByDate(getTodayDateJst());
}

async function recommendTomorrowRaces() {
  return recommendRacesByDate(getTomorrowDateJst());
}

async function recommendRacesByDateApi(date) {
  const normalized = normalizeDate(date);
  if (!normalized) {
    throw new Error('date must be YYYYMMDD');
  }
  return recommendRacesByDate(normalized);
}

module.exports = {
  recommendTodayRaces,
  recommendTomorrowRaces,
  recommendRacesByDateApi
};