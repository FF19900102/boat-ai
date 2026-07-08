const fs = require('fs');
const path = require('path');
const { scoreRace } = require('./scoreEngine');
const { buildBuyPlan } = require('./buyEngine');
const { evaluatePrediction, readHistory } = require('./learningEngine');
const { readAiWeights, writeAiWeights, mapToScoreWeights } = require('./weightLearningEngine');

const RACE_DATABASE_PATH = path.join(__dirname, 'raceDatabase.json');
const LEAGUE_HISTORY_PATH = path.join(__dirname, 'leagueHistory.json');
const OPTIMIZER_HISTORY_PATH = path.join(__dirname, 'optimizerHistory.json');

const MUTABLE_KEYS = [
  'laneWeight',
  'exhibitionWeight',
  'stWeight',
  'nationalWeight',
  'localWeight',
  'motorWeight',
  'boatWeight',
  'weatherWeight',
  'oddsWeight'
];

const CANDIDATE_DELTAS = [-0.3, -0.2, -0.1, -0.05, 0.05, 0.1, 0.2, 0.3];

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

function writeJsonArray(filePath, rows) {
  fs.writeFileSync(filePath, `${JSON.stringify(Array.isArray(rows) ? rows : [], null, 2)}\n`, 'utf8');
}

function clampWeight(value) {
  return Math.max(0.2, Math.min(3, Math.round(Number(value) * 100) / 100));
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toNormalizedDate(dateLike) {
  const dt = new Date(dateLike || Date.now());
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function buildPredictionStub(scored, tickets) {
  return {
    score: scored.score,
    buyDetails: tickets,
    anchors: {
      honmei: scored.ranked[0] || null
    }
  };
}

function buildSkipDecision(scored, tickets) {
  const topScore = toNumber(scored?.ranked?.[0]?.score, 0);
  const topExpectedValue = toNumber(tickets?.[0]?.expectedValue, 0);
  return topScore < 55 || topExpectedValue < 100;
}

function simulateAiOnRaces(aiId, aiWeightEntry, races) {
  const validRaces = Array.isArray(races)
    ? races.filter((race) => Array.isArray(race?.entries) && race.entries.length > 0 && String(race?.result?.order || ''))
    : [];

  if (validRaces.length === 0) {
    return {
      aiId,
      totalRaces: 0,
      roi: 0,
      profit: 0,
      hitRate: 0,
      expectedValue: 0,
      skipSuccessRate: 0,
      stakeTotal: 0,
      returnTotal: 0,
      skipped: 0,
      skippedSuccess: 0,
      replayRows: []
    };
  }

  const replayRows = [];
  let totalRaces = 0;
  let totalHit = 0;
  let totalProfit = 0;
  let totalStake = 0;
  let totalReturn = 0;
  let expectedValueTotal = 0;
  let expectedValueCount = 0;
  let skipped = 0;
  let skippedSuccess = 0;

  for (const race of validRaces) {
    const venueId = String(race?.venueId || '');
    const raceNo = String(race?.raceNo || '');
    const entries = Array.isArray(race?.entries) ? race.entries : [];
    const beforeInfo = race?.beforeInfo || { venueId, raceNo, entries: [] };
    const odds = race?.odds || { venueId, raceNo, trifecta: [], exacta: [], quinella: [], quinellaPlace: [] };
    const result = race?.result || { venueId, raceNo, order: '', payouts: [] };

    const scored = scoreRace({
      entries,
      beforeInfo,
      odds,
      weights: mapToScoreWeights(aiWeightEntry)
    });
    const buyPlan = buildBuyPlan({ ranked: scored.ranked, scoreRows: scored.score, odds });
    const predictionStub = buildPredictionStub(scored, buyPlan.tickets);
    const evaluation = evaluatePrediction({ venueId, raceNo, prediction: predictionStub, result, odds });

    const expectedValue = toNumber(buyPlan?.tickets?.[0]?.expectedValue, 0);
    const skip = buildSkipDecision(scored, buyPlan.tickets);
    if (skip) {
      skipped += 1;
      if (!evaluation.hit) {
        skippedSuccess += 1;
      }
    }

    totalRaces += 1;
    totalHit += evaluation.hit ? 1 : 0;
    totalProfit += toNumber(evaluation.profit, 0);
    totalStake += toNumber(evaluation.stake, 1000);
    totalReturn += evaluation.hit ? toNumber(evaluation.payout, 0) : 0;
    expectedValueTotal += expectedValue;
    expectedValueCount += expectedValue > 0 ? 1 : 0;

    replayRows.push({
      key: `OPT-${toNormalizedDate(Date.now())}-${venueId}-${raceNo}-${aiId}`,
      timestamp: new Date().toISOString(),
      aiId,
      aiName: aiWeightEntry.aiName,
      venueId,
      raceNo,
      buy: buyPlan.buy || [],
      topPick: buyPlan.buy?.[0] || '',
      result: result.order,
      payout: toNumber(evaluation.payout, 0),
      stake: toNumber(evaluation.stake, 1000),
      roi: toNumber(evaluation.roi, 0),
      profit: toNumber(evaluation.profit, 0),
      hit: Boolean(evaluation.hit),
      expectedValue,
      skip,
      comment: 'optimizer replay'
    });
  }

  return {
    aiId,
    totalRaces,
    roi: totalStake > 0 ? Math.round((totalReturn / totalStake) * 1000) / 10 : 0,
    profit: Math.round(totalProfit),
    hitRate: totalRaces > 0 ? Math.round((totalHit / totalRaces) * 1000) / 10 : 0,
    expectedValue: expectedValueCount > 0 ? Math.round((expectedValueTotal / expectedValueCount) * 10) / 10 : 0,
    skipSuccessRate: skipped > 0 ? Math.round((skippedSuccess / skipped) * 1000) / 10 : 0,
    stakeTotal: totalStake,
    returnTotal: totalReturn,
    skipped,
    skippedSuccess,
    replayRows
  };
}

function readRaceDatabase() {
  return readJsonArray(RACE_DATABASE_PATH);
}

function readLeagueHistory() {
  return readJsonArray(LEAGUE_HISTORY_PATH);
}

function readOptimizerHistory() {
  return readJsonArray(OPTIMIZER_HISTORY_PATH);
}

function writeOptimizerHistory(rows) {
  writeJsonArray(OPTIMIZER_HISTORY_PATH, rows.slice(0, 5000));
}

function calcObjective(metrics) {
  const roi = toNumber(metrics?.roi, 0);
  const profit = toNumber(metrics?.profit, 0);
  const hitRate = toNumber(metrics?.hitRate, 0);
  const expectedValue = toNumber(metrics?.expectedValue, 0);
  const skipSuccessRate = toNumber(metrics?.skipSuccessRate, 0);

  return roi
    + (profit / 2000)
    + (hitRate * 0.35)
    + ((expectedValue - 100) * 0.25)
    + (skipSuccessRate * 0.15);
}

function cloneWeights(entry) {
  return JSON.parse(JSON.stringify(entry || {}));
}

function optimizeSingleAi(aiId, weightsStore, raceRows) {
  const current = cloneWeights(weightsStore[aiId]);
  const beforeMetrics = simulateAiOnRaces(aiId, current, raceRows);
  let bestWeights = cloneWeights(current);
  let bestMetrics = { ...beforeMetrics };
  let bestObjective = calcObjective(beforeMetrics);

  for (const key of MUTABLE_KEYS) {
    const baseValue = toNumber(current[key], 1);
    for (const delta of CANDIDATE_DELTAS) {
      const candidate = cloneWeights(bestWeights);
      candidate[key] = clampWeight(baseValue + delta);
      const candidateMetrics = simulateAiOnRaces(aiId, candidate, raceRows);
      const candidateObjective = calcObjective(candidateMetrics);

      // Safety rollback: never adopt a candidate with worse ROI.
      if (candidateMetrics.roi < bestMetrics.roi) {
        continue;
      }

      if (candidateObjective > bestObjective + 0.01) {
        bestWeights = candidate;
        bestMetrics = candidateMetrics;
        bestObjective = candidateObjective;
      }
    }
  }

  const improved = bestMetrics.roi > beforeMetrics.roi || bestMetrics.profit > beforeMetrics.profit;
  if (!improved) {
    return {
      aiId,
      aiName: current.aiName,
      improved: false,
      before: current,
      after: current,
      metricsBefore: beforeMetrics,
      metricsAfter: beforeMetrics
    };
  }

  const after = {
    ...bestWeights,
    lastDelta: Object.fromEntries(
      MUTABLE_KEYS
        .map((key) => [key, Math.round((toNumber(bestWeights[key], 1) - toNumber(current[key], 1)) * 100) / 100])
        .filter(([, delta]) => delta !== 0)
    ),
    updatedAt: new Date().toISOString()
  };

  return {
    aiId,
    aiName: current.aiName,
    improved: true,
    before: current,
    after,
    metricsBefore: beforeMetrics,
    metricsAfter: bestMetrics
  };
}

function replayLeagueWithWeights(weightsStore, raceRows) {
  const aiIds = Object.keys(weightsStore || {});
  const replayRows = [];

  for (const aiId of aiIds) {
    const aiWeightEntry = weightsStore[aiId];
    const metrics = simulateAiOnRaces(aiId, aiWeightEntry, raceRows.slice(0, 200));
    replayRows.push(...metrics.replayRows);
  }

  const history = readLeagueHistory().filter((row) => !String(row?.key || '').startsWith('OPT-'));
  const merged = [...replayRows, ...history].slice(0, 5000);
  writeJsonArray(LEAGUE_HISTORY_PATH, merged);
}

function runOptimizer() {
  // Read all required sources.
  const predictionHistory = readHistory();
  const leagueHistory = readLeagueHistory();
  const raceRows = readRaceDatabase();
  const weightsStore = readAiWeights();
  const aiIds = Object.keys(weightsStore || {});

  const beforeMetricsByAi = new Map();
  for (const aiId of aiIds) {
    beforeMetricsByAi.set(aiId, simulateAiOnRaces(aiId, weightsStore[aiId], raceRows));
  }

  const updates = [];
  for (const aiId of aiIds) {
    updates.push(optimizeSingleAi(aiId, weightsStore, raceRows));
  }

  const nextStore = { ...weightsStore };
  let improvedAI = 0;
  for (const row of updates) {
    if (row.improved) {
      improvedAI += 1;
      nextStore[row.aiId] = row.after;
    }
  }

  if (improvedAI > 0) {
    writeAiWeights(nextStore);
  }

  // Replay league ranking with optimized weights.
  replayLeagueWithWeights(nextStore, raceRows);

  const historyRows = readOptimizerHistory();
  const now = new Date().toISOString();

  const logRows = updates.map((row) => ({
    timestamp: now,
    aiId: row.aiId,
    aiName: row.aiName,
    before: row.before,
    after: row.after,
    roiBefore: toNumber(row.metricsBefore?.roi, 0),
    roiAfter: toNumber(row.metricsAfter?.roi, 0),
    roiChange: Math.round((toNumber(row.metricsAfter?.roi, 0) - toNumber(row.metricsBefore?.roi, 0)) * 10) / 10,
    profitBefore: Math.round(toNumber(row.metricsBefore?.profit, 0)),
    profitAfter: Math.round(toNumber(row.metricsAfter?.profit, 0)),
    profitChange: Math.round(toNumber(row.metricsAfter?.profit, 0) - toNumber(row.metricsBefore?.profit, 0)),
    hitRateBefore: toNumber(row.metricsBefore?.hitRate, 0),
    hitRateAfter: toNumber(row.metricsAfter?.hitRate, 0),
    expectedValueBefore: toNumber(row.metricsBefore?.expectedValue, 0),
    expectedValueAfter: toNumber(row.metricsAfter?.expectedValue, 0),
    skipSuccessRateBefore: toNumber(row.metricsBefore?.skipSuccessRate, 0),
    skipSuccessRateAfter: toNumber(row.metricsAfter?.skipSuccessRate, 0),
    improved: row.improved
  }));

  writeOptimizerHistory([...logRows, ...historyRows]);

  const beforeRoiAvg = aiIds.length
    ? aiIds.reduce((sum, aiId) => sum + toNumber(beforeMetricsByAi.get(aiId)?.roi, 0), 0) / aiIds.length
    : 0;
  const afterRoiAvg = aiIds.length
    ? aiIds.reduce((sum, aiId) => sum + toNumber(simulateAiOnRaces(aiId, nextStore[aiId], raceRows)?.roi, 0), 0) / aiIds.length
    : 0;

  return {
    success: true,
    updatedAI: aiIds.length,
    improvedAI,
    averageRoiBefore: Math.round(beforeRoiAvg * 10) / 10,
    averageRoiAfter: Math.round(afterRoiAvg * 10) / 10,
    // Echo that inputs were loaded for transparency.
    sourceRows: {
      predictionHistory: predictionHistory.length,
      leagueHistory: leagueHistory.length,
      raceDatabase: raceRows.length
    }
  };
}

function getOptimizerHistory(limit = 100) {
  return readOptimizerHistory().slice(0, limit);
}

module.exports = {
  runOptimizer,
  getOptimizerHistory
};
