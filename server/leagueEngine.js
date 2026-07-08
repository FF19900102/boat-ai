const fs = require('fs');
const path = require('path');
const { scoreRace } = require('./scoreEngine');
const { buildBuyPlan } = require('./buyEngine');
const { evaluatePrediction } = require('./learningEngine');
const { buildRoughRace } = require('./roughRaceEngine');
const { buildRaceDecision } = require('./raceDecisionEngine');
const { toNumber } = require('./weatherEngine');
const { getWeightsSnapshot, mapToScoreWeights } = require('./weightLearningEngine');

const LEAGUE_HISTORY_PATH = path.join(__dirname, 'leagueHistory.json');

const LEAGUE_PROFILES = [
  {
    id: 'AI-01',
    aiName: '展示重視AI',
    strategy: '展示タイムを重視',
    comment: '展示タイム重視ではイン先行を評価',
    weights: { lane: 1.0, exhibition: 1.45, st: 0.95, national: 0.9, local: 0.9, motor: 0.85, boat: 0.8, weather: 1.0 }
  },
  {
    id: 'AI-02',
    aiName: 'ST重視AI',
    strategy: 'STを重視',
    comment: '踏み込み評価で先手を取れる艇を重視',
    weights: { lane: 1.0, exhibition: 0.95, st: 1.5, national: 0.95, local: 0.9, motor: 0.85, boat: 0.8, weather: 1.0 }
  },
  {
    id: 'AI-03',
    aiName: 'モーター重視AI',
    strategy: 'モーター2連率を重視',
    comment: '足色優勢の艇を上位に取る',
    weights: { lane: 0.95, exhibition: 0.9, st: 0.9, national: 0.95, local: 0.9, motor: 1.8, boat: 1.2, weather: 1.0 }
  },
  {
    id: 'AI-04',
    aiName: '期待値重視AI',
    strategy: '期待値を重視',
    comment: '妙味優先で期待値上位を狙う',
    weights: { lane: 0.9, exhibition: 1.0, st: 1.0, national: 1.05, local: 1.0, motor: 1.0, boat: 0.95, weather: 1.05 }
  },
  {
    id: 'AI-05',
    aiName: '穴狙いAI',
    strategy: '穴狙い',
    comment: '外枠や人気薄の一撃を拾う',
    weights: { lane: 0.7, exhibition: 1.0, st: 1.1, national: 0.95, local: 1.0, motor: 1.25, boat: 1.15, weather: 1.25 }
  }
];

function readLeagueHistory() {
  try {
    if (!fs.existsSync(LEAGUE_HISTORY_PATH)) {
      return [];
    }
    const raw = fs.readFileSync(LEAGUE_HISTORY_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function writeLeagueHistory(rows) {
  fs.writeFileSync(LEAGUE_HISTORY_PATH, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
}

function buildLeaguePredictions({ venueId, raceNo, entries, beforeInfo, odds, result }) {
  return LEAGUE_PROFILES.map((profile) => {
    const weightSnapshot = getWeightsSnapshot()[profile.id];
    const scored = scoreRace({ entries, beforeInfo, odds, weights: mapToScoreWeights(weightSnapshot) });
    const buyPlan = buildBuyPlan({ ranked: scored.ranked, scoreRows: scored.score, odds });
    const roughRace = buildRoughRace({ scoreRows: scored.score, beforeInfo, odds });
    const confidence = scored.ranked[0]?.score || 0;
    const tempPrediction = {
      score: scored.score,
      buyDetails: buyPlan.tickets,
      anchors: { honmei: scored.ranked[0] || null }
    };
    const decision = buildRaceDecision({
      scoreRows: scored.score,
      roughRace,
      buyDetails: buyPlan.tickets,
      confidence,
      odds,
      beforeInfo
    });
    const evaluation = result?.order
      ? evaluatePrediction({ venueId, raceNo, prediction: tempPrediction, result, odds })
      : null;

    return {
      aiId: profile.id,
      aiName: profile.aiName,
      strategy: profile.strategy,
      topPick: buyPlan.buy[0] || '',
      buy: buyPlan.buy,
      score: scored.ranked[0]?.score || 0,
      expectedValue: buyPlan.tickets[0]?.expectedValue || 0,
      comment: profile.comment,
      weights: weightSnapshot,
      detailScore: scored.score,
      scoreRows: scored.score,
      buyDetails: buyPlan.tickets,
      roughRace,
      decision,
      confidence,
      evaluation,
      roi: evaluation?.roi || 0,
      hit: evaluation?.hit || false,
      profit: evaluation?.profit || 0,
      payout: evaluation?.payout || 0,
      stake: evaluation?.stake || 1000,
      result: result?.order || ''
    };
  });
}

function saveLeagueHistory({ venueId, raceNo, leaguePredictions, result }) {
  if (!result?.order || !Array.isArray(leaguePredictions) || leaguePredictions.length === 0) {
    return;
  }

  const history = readLeagueHistory();

  for (const row of leaguePredictions) {
    const key = `${row.aiId}-${venueId}-${raceNo}-${result.order}`;
    const record = {
      key,
      timestamp: new Date().toISOString(),
      aiId: row.aiId,
      aiName: row.aiName,
      venueId,
      raceNo,
      buy: row.buy || [],
      topPick: row.topPick || '',
      result: result.order,
      payout: toNumber(row.payout, 0),
      stake: toNumber(row.stake, 1000),
      roi: toNumber(row.roi, 0),
      profit: toNumber(row.profit, 0),
      hit: Boolean(row.hit),
      comment: row.comment || ''
    };

    const existingIndex = history.findIndex((item) => item?.key === key);
    if (existingIndex >= 0) {
      history[existingIndex] = record;
    } else {
      history.unshift(record);
    }
  }

  writeLeagueHistory(history.slice(0, 5000));
}

function buildLeagueLeaderboard(limit = 5) {
  const history = readLeagueHistory();
  const now = new Date();
  const todayRows = history.filter((row) => {
    const date = new Date(row?.timestamp || 0);
    return date.toDateString() === now.toDateString();
  });

  const grouped = new Map();
  for (const profile of LEAGUE_PROFILES) {
    grouped.set(profile.id, {
      profile,
      rows: []
    });
  }

  for (const row of todayRows) {
    const aiId = String(row?.aiId || '');
    if (!aiId || !grouped.has(aiId)) {
      continue;
    }
    grouped.get(aiId).rows.push(row);
  }

  return Array.from(grouped.values())
    .map(({ profile, rows }) => {
      const roi = rows.length ? rows.reduce((sum, row) => sum + toNumber(row?.roi, 0), 0) / rows.length : 0;
      const profit = rows.reduce((sum, row) => sum + toNumber(row?.profit, 0), 0);
      const hitRate = rows.length ? (rows.filter((row) => row.hit).length / rows.length) * 100 : 0;
      return {
        aiId: profile.id,
        aiName: profile.aiName,
        roi: Math.round(roi * 10) / 10,
        profit,
        hitRate: Math.round(hitRate * 10) / 10,
        totalRaces: rows.length,
        comment: profile.comment
      };
    })
    .sort((a, b) => b.roi - a.roi || b.profit - a.profit || b.hitRate - a.hitRate)
    .slice(0, limit)
    .map((row, index) => ({ rank: index + 1, ...row }));
}

module.exports = {
  LEAGUE_PROFILES,
  buildLeaguePredictions,
  saveLeagueHistory,
  buildLeagueLeaderboard,
  readLeagueHistory
};