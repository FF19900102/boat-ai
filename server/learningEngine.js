const fs = require('fs');
const path = require('path');
const { toNumber } = require('./weatherEngine');

const HISTORY_PATH = path.join(__dirname, 'predictionHistory.json');

function toDateKey(input = Date.now()) {
  const dt = new Date(input);
  const yyyy = String(dt.getFullYear());
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

function normalizeRaceNo(value) {
  const raceNo = String(value || '').trim();
  return raceNo || '';
}

function buildRaceKey({ date, venueId, raceNo }) {
  return `${toDateKey(date)}-${String(venueId || '').trim()}-${normalizeRaceNo(raceNo)}`;
}

function normalizeTicket(value) {
  return String(value || '')
    .replace(/[・\s/]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function extractActualOrder(result) {
  const directOrder = normalizeTicket(result?.order || '');
  if (directOrder) {
    return directOrder;
  }

  const payoutRows = Array.isArray(result?.payouts) ? result.payouts : [];
  const trifectaRow = payoutRows.find((row) => String(row?.type || '') === '3連単' && String(row?.ticket || ''));
  return normalizeTicket(trifectaRow?.ticket || '');
}

function readHistory() {
  try {
    if (!fs.existsSync(HISTORY_PATH)) {
      return [];
    }
    const raw = fs.readFileSync(HISTORY_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function writeHistory(rows) {
  fs.writeFileSync(HISTORY_PATH, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
}

function pickPayout(result, label) {
  const payouts = Array.isArray(result?.payouts) ? result.payouts : [];
  return payouts.find((row) => String(row?.type || '') === String(label || '')) || null;
}

function extractPredictionAnchors(prediction) {
  const scoreRows = Array.isArray(prediction?.score) ? prediction.score : [];
  const byRank = [...scoreRows].sort((a, b) => Number(a?.rank || 999) - Number(b?.rank || 999));
  const honmei = byRank[0] || {};
  const taiko = byRank[1] || {};
  const ana = byRank[2] || byRank[byRank.length - 1] || {};
  return {
    honmei: String(honmei?.lane || ''),
    taiko: String(taiko?.lane || ''),
    ana: String(ana?.lane || ''),
    aiDecision: String(prediction?.decision?.decision || prediction?.decision || ''),
    expectedValue: toNumber(prediction?.buyDetails?.[0]?.expectedValue, 0),
    recommendedStake: toNumber(prediction?.moneyPlan?.recommendedStake || prediction?.recommendedStake, 0),
    recommendedBuy: Array.isArray(prediction?.buy) ? prediction.buy.slice(0, 5) : []
  };
}

function buildLearningAdjustments(prediction, actualOrder) {
  const scoreRows = Array.isArray(prediction?.score) ? prediction.score : [];
  const top = scoreRows.find((row) => Number(row?.rank) === 1) || scoreRows[0] || {};
  const predictedTopLane = String(top?.lane || '');
  const actualTopLane = String(actualOrder || '').split('-')[0] || '';
  const hitTop = predictedTopLane && predictedTopLane === actualTopLane;

  return {
    laneWeight: hitTop ? -0.2 : 0.3,
    exhibitionWeight: hitTop ? 0.2 : 0.5,
    stWeight: hitTop ? 0.1 : 0.3,
    motorWeight: hitTop ? -0.1 : 0.2,
    weatherWeight: hitTop ? 0.1 : 0.2
  };
}

function buildLearningComment(learning) {
  const comments = [];
  if (toNumber(learning.exhibitionWeight, 0) > 0) {
    comments.push(`展示タイムの重みを+${learning.exhibitionWeight.toFixed(1)}しました。`);
  }
  if (toNumber(learning.motorWeight, 0) < 0) {
    comments.push(`モーター評価を少し下げました。`);
  }
  if (toNumber(learning.weatherWeight, 0) > 0) {
    comments.push(`天候補正を+${learning.weatherWeight.toFixed(1)}しました。`);
  }
  return comments.join(' ');
}

function evaluatePrediction({ venueId, raceNo, prediction, result, odds }) {
  const actualOrder = extractActualOrder(result);
  if (!actualOrder) {
    return null;
  }
  const primaryBuy = prediction?.buyDetails?.[0] || {};
  const hit = Boolean(primaryBuy.combo && actualOrder && primaryBuy.combo === actualOrder);
  const payoutRow = Array.isArray(result?.payouts)
    ? result.payouts.find((row) => String(row?.type || '') === '3連単' && normalizeTicket(row?.ticket || '') === actualOrder)
    : null;
  const officialPayout = toNumber(payoutRow?.payout, 0);
  const stake = 1000;
  const unitStake = 100;
  const purchaseUnits = Math.max(1, Math.round(stake / unitStake));
  const payout = hit ? officialPayout * purchaseUnits : 0;
  const profit = payout - stake;
  const roi = stake > 0 ? Math.round((payout / stake) * 1000) / 10 : 0;
  const predictedRank = prediction?.anchors?.honmei?.rank || 1;
  const learning = buildLearningAdjustments(prediction, actualOrder);
  const learningComment = buildLearningComment(learning);

  return {
    hit,
    hitType: '3連単',
    predictedRank,
    actualOrder,
    roi,
    profit,
    learning,
    learningComment,
    payout,
    stake,
    purchaseUnits,
    officialPayout,
    oddsSnapshot: odds || {}
  };
}

function savePredictionHistory({ venueId, raceNo, prediction, result, odds }) {
  const nowIso = new Date().toISOString();
  const raceKey = buildRaceKey({ date: nowIso, venueId, raceNo });
  const history = readHistory();
  const existingIndex = history.findIndex((row) => String(row?.key || '') === raceKey);
  const existing = existingIndex >= 0 ? history[existingIndex] : null;
  const anchors = extractPredictionAnchors(prediction);

  const baseRecord = {
    key: raceKey,
    date: toDateKey(nowIso),
    timestamp: nowIso,
    predictedAt: existing?.predictedAt || nowIso,
    venueId: String(venueId || ''),
    raceNo: normalizeRaceNo(raceNo),
    usedAI: String(prediction?.bestAiRecommendation?.aiId || prediction?.bestAiRecommendation?.aiName || ''),
    aiDecision: anchors.aiDecision,
    honmei: anchors.honmei,
    taiko: anchors.taiko,
    ana: anchors.ana,
    recommendedBuy: anchors.recommendedBuy,
    expectedValue: anchors.expectedValue,
    recommendedStake: anchors.recommendedStake,
    prediction: {
      score: prediction?.score || [],
      buyDetails: prediction?.buyDetails || [],
      decision: prediction?.decision || {}
    },
    buy: prediction?.buy || [],
    roughRace: prediction?.roughRace || {},
    result: {
      order: result?.order || existing?.result?.order || '',
      kimarite: result?.kimarite || existing?.result?.kimarite || '',
      payouts: Array.isArray(result?.payouts) ? result.payouts : (existing?.result?.payouts || [])
    },
    settlement: existing?.settlement || {
      isFinal: false,
      hit: null,
      payout: 0,
      stake: 0,
      profit: 0,
      roi: 0,
      settledAt: ''
    },
    payout: toNumber(existing?.payout, 0),
    roi: toNumber(existing?.roi, 0),
    profit: toNumber(existing?.profit, 0),
    hit: existing?.hit === true ? true : (existing?.hit === false ? false : null),
    evaluation: existing?.evaluation || null
  };

  const evaluation = evaluatePrediction({ venueId, raceNo, prediction, result, odds });
  if (evaluation) {
    baseRecord.result = {
      order: result?.order || '',
      kimarite: result?.kimarite || '',
      payouts: Array.isArray(result?.payouts) ? result.payouts : []
    };
    baseRecord.settlement = {
      isFinal: true,
      hit: Boolean(evaluation.hit),
      payout: toNumber(evaluation.payout, 0),
      stake: toNumber(evaluation.stake, 1000),
      profit: toNumber(evaluation.profit, 0),
      roi: toNumber(evaluation.roi, 0),
      settledAt: nowIso,
      order: String(evaluation.actualOrder || ''),
      kimarite: String(result?.kimarite || '')
    };
    baseRecord.payout = toNumber(evaluation.payout, 0);
    baseRecord.roi = toNumber(evaluation.roi, 0);
    baseRecord.profit = toNumber(evaluation.profit, 0);
    baseRecord.hit = Boolean(evaluation.hit);
    baseRecord.evaluation = evaluation;
    baseRecord.trifectaPayout = toNumber(pickPayout(result, '3連単')?.payout, 0);
    baseRecord.exactaPayout = toNumber(pickPayout(result, '2連単')?.payout, 0);
    baseRecord.quinellaPlacePayout = toNumber(pickPayout(result, '拡連複')?.payout, 0);
  }

  if (existingIndex >= 0) {
    history[existingIndex] = { ...existing, ...baseRecord };
  } else {
    history.unshift(baseRecord);
  }

  writeHistory(history.slice(0, 1000));
  return evaluation || { pending: true };
}

function settlePredictionHistory({ venueId, raceNo, result, odds }) {
  const history = readHistory();
  const target = history.find((row) => String(row?.venueId || '') === String(venueId || '') && String(row?.raceNo || '') === normalizeRaceNo(raceNo));
  if (!target) {
    return null;
  }

  const payload = {
    venueId,
    raceNo,
    prediction: {
      score: target?.prediction?.score || [],
      buyDetails: target?.prediction?.buyDetails || [],
      decision: target?.prediction?.decision || {}
    },
    result,
    odds
  };

  savePredictionHistory(payload);
  return readHistory().find((row) => String(row?.key || '') === String(target?.key || '')) || null;
}

module.exports = {
  evaluatePrediction,
  savePredictionHistory,
  settlePredictionHistory,
  readHistory,
  buildRaceKey
};