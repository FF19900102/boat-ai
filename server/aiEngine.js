const { parseTodayVenues, parseRaceList, parseEntries, parseBeforeInfo, parseOdds, parseResult } = require('./parsers');
const { scoreRace } = require('./scoreEngine');
const { buildBuyPlan } = require('./buyEngine');
const { buildExplanation } = require('./explainEngine');
const { buildRoughRace } = require('./roughRaceEngine');
const { buildRaceDecision } = require('./raceDecisionEngine');
const { savePredictionHistory } = require('./learningEngine');
const { buildLeaguePredictions, saveLeagueHistory, buildLeagueLeaderboard } = require('./leagueEngine');
const { updateAiWeightsFromLeagueResults, getWeightsSnapshot } = require('./weightLearningEngine');
const { buildValueRanking } = require('./valueEngine');
const { predictModel, getModelStatus } = require('./mlEngine');
const { classifyRaceCondition, updateHeadCoachLearning } = require('./headCoachEngine');

const venueCodeMap = {
  kiryu: '01',
  toda: '02',
  edogawa: '03',
  heiwajima: '04',
  tamagawa: '05',
  hamanako: '06',
  gamagori: '07',
  tokoname: '09',
  tsu: '12',
  mikuni: '13',
  biwako: '14',
  suminoe: '15',
  amagasaki: '16',
  naruto: '17',
  marugame: '18',
  tokuyama: '19',
  shimonoseki: '20',
  wakamatsu: '21',
  ashiya: '23',
  fukuoka: '22',
  karatsu: '23',
  omura: '24',
  sakaide: '21',
  kojima: '22',
  miya: '24',
  miyajima: '24'
};

function formatJstDate(date = new Date()) {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  const jstMs = utcMs + 9 * 60 * 60000;
  const jstDate = new Date(jstMs);
  const year = jstDate.getFullYear();
  const month = String(jstDate.getMonth() + 1).padStart(2, '0');
  const day = String(jstDate.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function normalizeTargetDate(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length === 8 ? digits : '';
}

async function fetchHtmlFromCandidates(candidateUrls) {
  for (const targetUrl of candidateUrls) {
    try {
      const response = await fetch(targetUrl);
      const text = await response.text();
      if (response.ok && text && !/予期せぬエラー/.test(text)) {
        return text;
      }
    } catch (error) {
      // ignore and try next candidate
    }
  }
  return '';
}

function normalizeLane(value) {
  return String(value || '').replace(/[^0-9]/g, '').trim();
}

function buildAiComment(anchors, tickets) {
  return '';
}

function buildCommentFromExplanation(explanation, tickets, roughRace, decision) {
  const topValueTickets = [...(Array.isArray(tickets) ? tickets : [])]
    .sort((a, b) => (b.expectedValue || 0) - (a.expectedValue || 0))
    .slice(0, 2)
    .map((ticket) => `${ticket.combo} 期待値${Math.round(ticket.expectedValue)}%`);

  const lines = [
    decision?.decision ? `${decision.decision}：${decision.reason}` : '',
    roughRace?.comment || '',
    explanation?.summary || 'データ不足のため、現時点では推奨を保留。',
    explanation?.strengths?.length ? `強み: ${explanation.strengths.join('・')}` : '',
    explanation?.risks?.length ? `不安: ${explanation.risks.join('・')}` : '',
    explanation?.recommendation || '',
    topValueTickets.length ? `期待値注目: ${topValueTickets.join(' / ')}` : ''
  ].filter(Boolean);

  return lines.slice(0, 5).join('\n');
}

function buildStatisticsComment(scored) {
  const historyStats = scored?.historyStats;
  const lane1WinRate = Number(historyStats?.venueStats?.lane1WinRate || 0);
  const totalRaces = Number(historyStats?.venueStats?.totalRaces || 0);
  const venueId = String(scored?.statisticsContext?.venueId || '当該会場');
  if (totalRaces <= 0) {
    return '';
  }

  const comments = [];
  comments.push(`過去データでは${venueId}の${totalRaces}レースを統計参照`);
  comments.push(`1号艇勝率${lane1WinRate}%`);

  const applied = Array.isArray(historyStats?.appliedCorrections)
    ? historyStats.appliedCorrections.filter(Boolean)
    : [];
  if (applied.length > 0) {
    comments.push(`統計補正: ${applied.slice(0, 2).join(' / ')}`);
  }

  return comments.join('。');
}

function buildPrediction({ venueId, raceNo, entries, beforeInfo, odds, result, todayVenues, raceList }) {
  const modelStatus = getModelStatus();
  const fallbackScored = modelStatus.available ? null : scoreRace({ entries, beforeInfo, odds });
  const modelPrediction = modelStatus.available ? predictModel({ entries, beforeInfo, odds }) : null;
  const scored = modelPrediction
    ? {
        ...modelPrediction,
        ...modelPrediction,
        score: modelPrediction.score,
        ranked: modelPrediction.ranked,
        weatherContext: modelPrediction.weatherContext,
        statisticsContext: modelPrediction.statisticsContext,
        historyStats: modelPrediction.historyStats
      }
    : fallbackScored;
  const buyPlan = buildBuyPlan({ ranked: scored.ranked, scoreRows: scored.score, odds });
  const valueRanking = buildValueRanking({ scoreRows: scored.score, odds });
  const roughRace = buildRoughRace({ scoreRows: scored.score, beforeInfo, odds });
  const confidence = scored.ranked[0]?.score || 0;
  const league = buildLeaguePredictions({ venueId, raceNo, entries, beforeInfo, odds, result });
  const raceRow = (Array.isArray(raceList) ? raceList : []).find((row) => String(row?.raceNo || '') === String(raceNo || '')) || {};
  const venueRow = (Array.isArray(todayVenues) ? todayVenues : []).find((row) => String(row?.venueId || '') === String(venueId || '')) || {};
  const conditionContext = classifyRaceCondition({
    venueId,
    raceNo,
    conditionContext: {
      raceName: String(raceRow?.raceName || venueRow?.raceName || '')
    }
  });

  const anchors = {
    honmei: scored.ranked[0] || null,
    taikou: scored.ranked[1] || null,
    ana: scored.ranked[2] || scored.ranked[scored.ranked.length - 1] || null,
    resultHint: result?.order || ''
  };

  const explanation = buildExplanation({
    scored,
    weatherContext: scored.weatherContext,
    tickets: buyPlan.tickets
  });
  const decision = buildRaceDecision({
    scoreRows: scored.score,
    roughRace,
    buyDetails: buyPlan.tickets,
    confidence,
    odds,
    beforeInfo
  });
  let aiComment = buildCommentFromExplanation(explanation, buyPlan.tickets, roughRace, decision);
  const statisticsComment = buildStatisticsComment(scored);
  if (statisticsComment) {
    aiComment = `${aiComment}\n${statisticsComment}`;
  }

  return {
    venueId,
    raceNo,
    score: scored.score,
    buy: buyPlan.buy,
    buyDetails: buyPlan.tickets,
    valueRanking,
    model: modelStatus,
    anchors,
    aiComment,
    explanation,
    roughRace,
    decision,
    league,
    conditionContext,
    statistics: scored.statisticsContext,
    historyStats: scored.historyStats
  };
}

async function predictRace(venueId, raceNo, options = {}) {
  const { persistLearning = true } = options || {};
  const raceData = options?.raceData || null;
  const date = normalizeTargetDate(options?.targetDate) || formatJstDate();
  const venueCode = venueCodeMap[venueId] || '';

  const todayUrl = 'https://www.boatrace.jp/owpc/pc/race/index';
  const raceListUrl = venueCode ? `https://www.boatrace.jp/owpc/pc/race/raceindex?jcd=${venueCode}&hd=${date}` : todayUrl;
  const entriesUrl = venueCode ? `https://www.boatrace.jp/owpc/pc/race/racelist?rno=${raceNo}&jcd=${venueCode}&hd=${date}` : '';
  const beforeUrl = venueCode ? `https://www.boatrace.jp/owpc/pc/race/beforeinfo?rno=${raceNo}&jcd=${venueCode}&hd=${date}` : '';
  const oddsUrls = [
    `https://www.boatrace.jp/owpc/pc/race/odds3t?rno=${raceNo}&jcd=${venueCode}&hd=${date}`,
    `https://www.boatrace.jp/owpc/pc/race/odds2tf?rno=${raceNo}&jcd=${venueCode}&hd=${date}`,
    `https://www.boatrace.jp/owpc/pc/race/oddsk?rno=${raceNo}&jcd=${venueCode}&hd=${date}`,
    `https://www.boatrace.jp/owpc/pc/race/odds?rno=${raceNo}&jcd=${venueCode}&hd=${date}`,
    `https://www.boatrace.jp/owpc/pc/race/odds?jcd=${venueCode}&rno=${raceNo}&hd=${date}`,
    `https://www.boatrace.jp/owpc/pc/race/odds3?rno=${raceNo}&jcd=${venueCode}&hd=${date}`,
    `https://www.boatrace.jp/owpc/pc/race/odds2?rno=${raceNo}&jcd=${venueCode}&hd=${date}`
  ];
  const resultUrls = [
    `https://www.boatrace.jp/owpc/pc/race/raceresult?rno=${raceNo}&jcd=${venueCode}&hd=${date}`,
    `https://www.boatrace.jp/owpc/pc/race/raceresult?jcd=${venueCode}&rno=${raceNo}&hd=${date}`
  ];

  const todayVenues = Array.isArray(raceData?.todayVenues) ? raceData.todayVenues : [];
  const raceList = Array.isArray(raceData?.raceList) ? raceData.raceList : [];
  const entries = Array.isArray(raceData?.entries) && raceData.entries.length > 0
    ? raceData.entries
    : null;
  const beforeInfo = raceData?.beforeInfo || null;
  const odds = raceData?.odds || null;
  const result = raceData?.result || null;

  let resolvedTodayVenues = todayVenues;
  let resolvedRaceList = raceList;
  let resolvedEntries = entries;
  let resolvedBeforeInfo = beforeInfo;
  let resolvedOdds = odds;
  let resolvedResult = result;

  if (!raceData || !resolvedEntries || !resolvedBeforeInfo || !resolvedOdds || !resolvedResult) {
    const [liveTodayHtml, liveRaceListHtml, liveEntriesHtml, liveBeforeHtml, liveOddsHtml, liveResultHtml] = await Promise.all([
      todayVenues.length > 0 ? Promise.resolve('') : fetchHtmlFromCandidates([todayUrl]),
      raceList.length > 0 ? Promise.resolve('') : fetchHtmlFromCandidates([raceListUrl]),
      resolvedEntries ? Promise.resolve('') : (entriesUrl ? fetchHtmlFromCandidates([entriesUrl]) : Promise.resolve('')),
      resolvedBeforeInfo ? Promise.resolve('') : (beforeUrl ? fetchHtmlFromCandidates([beforeUrl]) : Promise.resolve('')),
      resolvedOdds ? Promise.resolve('') : fetchHtmlFromCandidates(oddsUrls),
      resolvedResult ? Promise.resolve('') : fetchHtmlFromCandidates(resultUrls)
    ]);

    if (!resolvedTodayVenues.length && liveTodayHtml) {
      resolvedTodayVenues = parseTodayVenues(liveTodayHtml);
    }
    if (!resolvedRaceList.length && liveRaceListHtml) {
      resolvedRaceList = parseRaceList(liveRaceListHtml, venueId);
    }
    if (!resolvedEntries && liveEntriesHtml) {
      resolvedEntries = parseEntries(liveEntriesHtml, venueId, raceNo);
    }
    if (!resolvedBeforeInfo && liveBeforeHtml) {
      resolvedBeforeInfo = parseBeforeInfo(liveBeforeHtml, venueId, raceNo);
    }
    if (!resolvedOdds && liveOddsHtml) {
      resolvedOdds = parseOdds(liveOddsHtml, venueId, raceNo);
    }
    if (!resolvedResult && liveResultHtml) {
      resolvedResult = parseResult(liveResultHtml, venueId, raceNo);
    }
  }

  const finalEntries = Array.isArray(resolvedEntries) ? resolvedEntries : [];
  const finalBeforeInfo = resolvedBeforeInfo || { venueId, raceNo, weather: '', windDirection: '', windSpeed: '', waveHeight: '', airTemperature: '', waterTemperature: '', entries: [] };
  const finalOdds = resolvedOdds || { venueId, raceNo, trifecta: [], exacta: [], quinella: [], quinellaPlace: [] };
  const finalResult = resolvedResult || { venueId, raceNo, order: '', kimarite: '', finishers: [], payouts: [] };

  const prediction = buildPrediction({ venueId, raceNo, entries: finalEntries, beforeInfo: finalBeforeInfo, odds: finalOdds, result: finalResult, todayVenues: resolvedTodayVenues, raceList: resolvedRaceList });
  const learningResult = persistLearning ? savePredictionHistory({ venueId, raceNo, prediction, result: finalResult, odds: finalOdds }) : null;
  if (persistLearning) {
    saveLeagueHistory({ venueId, raceNo, leaguePredictions: prediction.league, result: finalResult });
  }
  const weightLearningComments = persistLearning && finalResult?.order ? updateAiWeightsFromLeagueResults(prediction.league) : [];
  const leagueLeaderboard = buildLeagueLeaderboard(5);

  if (learningResult?.learningComment) {
    prediction.aiComment = `${prediction.aiComment}\n学習: ${learningResult.learningComment}`;
    prediction.learning = learningResult;
  }

  if (persistLearning && finalResult?.order) {
    prediction.headCoachLearning = updateHeadCoachLearning({
      prediction,
      result: finalResult,
      venueId,
      raceNo,
      outcome: {
        selectedAiId: prediction?.bestAiRecommendation?.aiId || ''
      }
    });
  }

  if (leagueLeaderboard[0]) {
    prediction.aiComment = `${prediction.aiComment}\n今日最も成績が良いAI\n${leagueLeaderboard[0].aiName}\n回収率${leagueLeaderboard[0].roi}%`;
  }

  if (weightLearningComments.length) {
    prediction.aiComment = `${prediction.aiComment}\n${weightLearningComments.slice(0, 2).join('\n')}`;
  }

  prediction.leagueLeaderboard = leagueLeaderboard;
  prediction.weights = getWeightsSnapshot();

  return prediction;
}

module.exports = {
  predictRace
};
