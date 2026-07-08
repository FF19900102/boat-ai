const fs = require('fs');
const path = require('path');
const { LEAGUE_PROFILES } = require('./leagueEngine');

const BACKTEST_HISTORY_PATH = path.join(__dirname, 'backtestHistory.json');
const LEAGUE_HISTORY_PATH = path.join(__dirname, 'leagueHistory.json');
const OPTIMIZER_HISTORY_PATH = path.join(__dirname, 'optimizerHistory.json');

function readJsonArray(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round1(value) {
  return Math.round(toNumber(value, 0) * 10) / 10;
}

function readBacktestHistory() {
  return readJsonArray(BACKTEST_HISTORY_PATH);
}

function readLeagueHistory() {
  return readJsonArray(LEAGUE_HISTORY_PATH);
}

function readOptimizerHistory() {
  return readJsonArray(OPTIMIZER_HISTORY_PATH);
}

function getAllAiProfiles() {
  return Array.isArray(LEAGUE_PROFILES) ? LEAGUE_PROFILES : [];
}

function groupRowsByAi(rows) {
  const grouped = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const aiId = String(row?.aiId || '').trim();
    if (!aiId) {
      continue;
    }
    if (!grouped.has(aiId)) {
      grouped.set(aiId, []);
    }
    grouped.get(aiId).push(row);
  }
  return grouped;
}

function sortByTimestampDesc(rows) {
  return [...rows].sort((a, b) => {
    const ta = new Date(a?.timestamp || 0).getTime();
    const tb = new Date(b?.timestamp || 0).getTime();
    return tb - ta;
  });
}

function sortByTimestampAsc(rows) {
  return [...rows].sort((a, b) => {
    const ta = new Date(a?.timestamp || 0).getTime();
    const tb = new Date(b?.timestamp || 0).getTime();
    return ta - tb;
  });
}

function calcMaxLosingStreak(leagueRows) {
  let maxStreak = 0;
  let current = 0;
  for (const row of sortByTimestampAsc(leagueRows)) {
    if (row?.hit) {
      current = 0;
      continue;
    }
    current += 1;
    if (current > maxStreak) {
      maxStreak = current;
    }
  }
  return maxStreak;
}

function aggregateOptimizerSignals(optimizerRows) {
  const rows = sortByTimestampDesc(optimizerRows).slice(0, 20);
  if (rows.length === 0) {
    return {
      improvedRate: 0,
      avgRoiAfter: 0
    };
  }

  const improvedCount = rows.filter((row) => Boolean(row?.improved)).length;
  const avgRoiAfter = rows.reduce((sum, row) => sum + toNumber(row?.roiAfter, 0), 0) / rows.length;
  return {
    improvedRate: (improvedCount / rows.length) * 100,
    avgRoiAfter
  };
}

function buildCandidate(aiProfile, backtestRows, leagueRows, optimizerRows) {
  const latestBacktest = sortByTimestampDesc(backtestRows)[0] || null;
  const recentBacktests = sortByTimestampDesc(backtestRows).slice(0, 20);

  const avgRoi = recentBacktests.length
    ? recentBacktests.reduce((sum, row) => sum + toNumber(row?.roi, 0), 0) / recentBacktests.length
    : 0;
  const avgHitRate = recentBacktests.length
    ? recentBacktests.reduce((sum, row) => sum + toNumber(row?.hitRate, 0), 0) / recentBacktests.length
    : 0;
  const avgSkipSuccessRate = recentBacktests.length
    ? recentBacktests.reduce((sum, row) => sum + toNumber(row?.skipSuccessRate, 0), 0) / recentBacktests.length
    : 0;
  const totalRaces = recentBacktests.reduce((sum, row) => sum + toNumber(row?.totalRaces, 0), 0);

  const latestRoi = toNumber(latestBacktest?.roi, 0);
  const latestProfit = toNumber(latestBacktest?.profit, 0);
  const latestHitRate = toNumber(latestBacktest?.hitRate, 0);
  const latestSkipSuccessRate = toNumber(latestBacktest?.skipSuccessRate, 0);
  const maxLosingStreak = calcMaxLosingStreak(leagueRows);

  const optimizer = aggregateOptimizerSignals(optimizerRows);
  const optimizerBoost = (optimizer.improvedRate * 0.04) + (optimizer.avgRoiAfter * 0.03);

  const score =
    (latestRoi * 0.45) +
    (avgRoi * 0.2) +
    ((latestProfit / 1000) * 0.15) +
    (latestHitRate * 0.1) +
    (Math.min(totalRaces, 300) * 0.02) +
    (latestSkipSuccessRate * 0.08) -
    (maxLosingStreak * 0.6) +
    optimizerBoost;

  return {
    aiId: aiProfile.id,
    aiName: latestBacktest?.aiName || aiProfile.aiName,
    roi: round1(latestRoi),
    profit: Math.round(latestProfit),
    hitRate: round1(latestHitRate),
    totalRaces: Math.round(totalRaces),
    maxLosingStreak,
    skipSuccessRate: round1(latestSkipSuccessRate),
    averageRoi: round1(avgRoi),
    score: round1(score),
    evaluatedAt: latestBacktest?.timestamp || null,
    reason: ''
  };
}

function buildReason(candidate) {
  const reasons = [];
  reasons.push(`直近バックテストROI ${round1(candidate.roi)}%`);

  if (candidate.profit > 0) {
    reasons.push(`利益 ${Math.round(candidate.profit).toLocaleString()}円を維持`);
  }

  if (candidate.maxLosingStreak <= 3) {
    reasons.push('連敗が短く安定');
  }

  if (candidate.skipSuccessRate > 0) {
    reasons.push(`見送り成功率 ${round1(candidate.skipSuccessRate)}%`);
  }

  if (reasons.length === 1) {
    reasons.push('評価項目の総合点が最も高い');
  }

  return reasons.slice(0, 3).join('、');
}

function evaluateBestAi() {
  const profiles = getAllAiProfiles();
  const backtestByAi = groupRowsByAi(readBacktestHistory());
  const leagueByAi = groupRowsByAi(readLeagueHistory());
  const optimizerByAi = groupRowsByAi(readOptimizerHistory());

  const candidates = profiles.map((profile) => {
    const candidate = buildCandidate(
      profile,
      backtestByAi.get(profile.id) || [],
      leagueByAi.get(profile.id) || [],
      optimizerByAi.get(profile.id) || []
    );
    candidate.reason = buildReason(candidate);
    return candidate;
  });

  const leaderboard = candidates
    .sort((a, b) => b.score - a.score || b.roi - a.roi || b.profit - a.profit || b.hitRate - a.hitRate)
    .map((row, index) => ({ rank: index + 1, ...row }));

  return {
    bestAi: leaderboard[0] || {
      aiId: profiles[0]?.id || '',
      aiName: profiles[0]?.aiName || '',
      roi: 0,
      profit: 0,
      hitRate: 0,
      totalRaces: 0,
      maxLosingStreak: 0,
      skipSuccessRate: 0,
      reason: '評価データ不足のため暫定選定'
    },
    leaderboard
  };
}

function getBestAiRecommendation() {
  const evaluated = evaluateBestAi();
  return evaluated.bestAi;
}

function getBestAiSummary(limit = 5) {
  const evaluated = evaluateBestAi();
  return {
    success: true,
    bestAi: evaluated.bestAi,
    leaderboard: evaluated.leaderboard.slice(0, Math.max(1, Number(limit) || 5)),
    evaluatedAt: new Date().toISOString()
  };
}

module.exports = {
  getBestAiRecommendation,
  getBestAiSummary
};
