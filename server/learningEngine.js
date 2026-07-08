const fs = require('fs');
const path = require('path');
const { toNumber } = require('./weatherEngine');

const HISTORY_PATH = path.join(__dirname, 'predictionHistory.json');

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
  const primaryBuy = prediction?.buyDetails?.[0] || {};
  const hit = Boolean(primaryBuy.combo && actualOrder && primaryBuy.combo === actualOrder);
  const payoutRow = Array.isArray(result?.payouts)
    ? result.payouts.find((row) => String(row?.type || '') === '3連単' && normalizeTicket(row?.ticket || '') === actualOrder)
    : null;
  const payout = toNumber(payoutRow?.payout, 0);
  const stake = 1000;
  const profit = hit ? payout - stake : -stake;
  const roi = stake > 0 ? Math.round(((hit ? payout : 0) / stake) * 1000) / 10 : 0;
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
    oddsSnapshot: odds || {}
  };
}

function savePredictionHistory({ venueId, raceNo, prediction, result, odds }) {
  const actualOrder = extractActualOrder(result);
  if (!actualOrder) {
    return null;
  }

  const evaluation = evaluatePrediction({ venueId, raceNo, prediction, result, odds });
  const history = readHistory();
  const key = `${venueId}-${raceNo}-${actualOrder}`;
  const existingIndex = history.findIndex((row) => row?.key === key);
  const record = {
    key,
    timestamp: new Date().toISOString(),
    venueId,
    raceNo,
    prediction: {
      score: prediction?.score || [],
      buyDetails: prediction?.buyDetails || [],
      decision: prediction?.decision || {}
    },
    buy: prediction?.buy || [],
    result: {
      order: result?.order || '',
      kimarite: result?.kimarite || '',
      payouts: result?.payouts || []
    },
    payout: evaluation.payout,
    roi: evaluation.roi,
    profit: evaluation.profit,
    hit: evaluation.hit,
    roughRace: prediction?.roughRace || {},
    evaluation
  };

  if (existingIndex >= 0) {
    history[existingIndex] = record;
  } else {
    history.unshift(record);
  }

  writeHistory(history.slice(0, 1000));
  return evaluation;
}

module.exports = {
  evaluatePrediction,
  savePredictionHistory,
  readHistory
};