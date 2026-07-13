const fs = require('fs');
const path = require('path');
const { buildAiConference } = require('./aiConferenceEngine');
const { readLeagueHistory } = require('./leagueEngine');

const HEAD_COACH_WEIGHTS_PATH = path.join(__dirname, 'headCoachWeights.json');
const NIGHT_VENUE_IDS = new Set(['hamanako', 'suminoe', 'marugame', 'shimonoseki', 'wakamatsu', 'omura']);

const DEFAULT_HEAD_COACH_STORE = {
  venue: {},
  condition: {},
  venueCondition: {}
};

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min = -1.5, max = 1.5) {
  return Math.max(min, Math.min(max, toNumber(value, 0)));
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureStore() {
  if (!fs.existsSync(HEAD_COACH_WEIGHTS_PATH)) {
    fs.writeFileSync(HEAD_COACH_WEIGHTS_PATH, `${JSON.stringify(DEFAULT_HEAD_COACH_STORE, null, 2)}\n`, 'utf8');
  }
}

function readStore() {
  try {
    ensureStore();
    const raw = fs.readFileSync(HEAD_COACH_WEIGHTS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : deepClone(DEFAULT_HEAD_COACH_STORE);
  } catch (error) {
    return deepClone(DEFAULT_HEAD_COACH_STORE);
  }
}

function writeStore(store) {
  fs.writeFileSync(HEAD_COACH_WEIGHTS_PATH, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
}

function normalizeVenueId(value) {
  return String(value || '').trim();
}

function normalizeConditionKey(value) {
  const text = String(value || '').trim();
  return text || '一般戦';
}

function getRaceName(prediction) {
  return String(prediction?.conditionContext?.raceName || prediction?.raceName || '').trim();
}

function classifyRaceCondition(prediction = {}) {
  const venueId = normalizeVenueId(prediction?.venueId);
  const raceName = getRaceName(prediction);
  const labels = [];

  if (NIGHT_VENUE_IDS.has(venueId)) {
    labels.push('ナイター');
  }
  if (/女子|レディース/i.test(raceName)) {
    labels.push('女子戦');
  }
  if (/SG/i.test(raceName)) {
    labels.push('SG');
  }
  if (/G1|GI/i.test(raceName)) {
    labels.push('G1');
  }
  if (/G2|GII/i.test(raceName)) {
    labels.push('G2');
  }
  if (!labels.length) {
    labels.push('一般戦');
  }

  return {
    venueId,
    raceNo: String(prediction?.raceNo || ''),
    raceName,
    labels,
    conditionKey: labels.join('|'),
    conditionLabel: labels.join(' / '),
    isNight: labels.includes('ナイター'),
    isWomen: labels.includes('女子戦'),
    isSG: labels.includes('SG'),
    isG1: labels.includes('G1')
  };
}

function calcMaxLosingStreak(leagueRows, aiId) {
  const rows = (Array.isArray(leagueRows) ? leagueRows : [])
    .filter((row) => String(row?.aiId || '') === String(aiId || ''))
    .sort((a, b) => new Date(b?.timestamp || 0) - new Date(a?.timestamp || 0));

  let streak = 0;
  let maxStreak = 0;
  for (const row of rows) {
    if (row?.hit) {
      streak = 0;
      continue;
    }
    streak += 1;
    if (streak > maxStreak) {
      maxStreak = streak;
    }
  }
  return maxStreak;
}

function getNode(store, scope, key) {
  if (!store[scope][key]) {
    store[scope][key] = {
      trustBias: 0,
      buyBias: 0,
      riskBias: 0,
      scoreBias: 0,
      sampleCount: 0,
      updatedAt: null
    };
  }
  return store[scope][key];
}

function updateNode(node, signal, outcome = {}) {
  const hit = Boolean(outcome.hit);
  const profit = toNumber(outcome.profit, 0);
  const roi = toNumber(outcome.roi, 0);
  const direction = signal >= 0 ? 1 : -1;
  const profitSignal = profit > 0 || roi >= 100 ? 1 : -1;
  const combined = hit ? 1 : (direction + profitSignal) / 2;

  node.trustBias = clamp(node.trustBias + combined * 0.12);
  node.buyBias = clamp(node.buyBias + (hit ? 0.08 : -0.06));
  node.riskBias = clamp(node.riskBias + (hit ? -0.05 : 0.08));
  node.scoreBias = clamp(node.scoreBias + combined * 0.1);
  node.sampleCount = toNumber(node.sampleCount, 0) + 1;
  node.updatedAt = new Date().toISOString();
}

function updateHeadCoachLearning({ prediction, result, outcome, venueId }) {
  const finalResult = result || prediction?.result || {};
  const actualOrder = String(finalResult?.order || '').trim();
  if (!actualOrder) {
    return null;
  }

  const conference = buildAiConference(prediction || {});
  const condition = classifyRaceCondition(prediction || {});
  const store = readStore();
  const venueKey = normalizeVenueId(venueId || prediction?.venueId);
  const conditionKey = normalizeConditionKey(condition.conditionKey);
  const pairKey = `${venueKey}::${conditionKey}`;
  const leagueRows = readLeagueHistory();
  const selectedAiId = String(outcome?.selectedAiId || '').trim();
  const selectedRow = (conference?.aiDecisions || []).find((row) => String(row?.roleId || '') === selectedAiId) || null;
  const topBuy = Array.isArray(prediction?.buyDetails) ? prediction.buyDetails[0] : null;
  const hit = Boolean(topBuy?.combo && actualOrder === topBuy.combo);
  const roi = toNumber(selectedRow?.performance?.roi || selectedRow?.roi || 0, 0);
  const profit = toNumber(selectedRow?.performance?.profit || selectedRow?.profit || 0, 0);
  const signal = hit || profit > 0 || roi >= 100 ? 1 : -1;

  updateNode(getNode(store, 'venue', venueKey || 'unknown'), signal, { hit, profit, roi });
  updateNode(getNode(store, 'condition', conditionKey), signal, { hit, profit, roi });
  updateNode(getNode(store, 'venueCondition', pairKey), signal, { hit, profit, roi });
  writeStore(store);

  return {
    venueKey,
    conditionKey,
    pairKey,
    selectedAiId,
    hit,
    roi,
    profit,
    actualOrder,
    conditionLabel: condition.conditionLabel,
    updatedAt: new Date().toISOString(),
    losingStreakByRole: Object.fromEntries((conference?.roleRanking || []).map((row) => [String(row?.roleId || ''), calcMaxLosingStreak(leagueRows, row?.mappedAiId || '')]))
  };
}

function buildTrustScore({ aiDecision, roleRow, venueBias, conditionBias, pairBias, losingStreak }) {
  const expectedValue = toNumber(aiDecision?.expectedValue, 0);
  const performanceWeight = toNumber(roleRow?.weight, 1);
  const roi = toNumber(roleRow?.roi, 0);
  const hitRate = toNumber(roleRow?.hitRate, 0);
  const profit = toNumber(roleRow?.profit, 0);
  const points = toNumber(aiDecision?.points, 0);
  const buyable = Boolean(aiDecision?.buyable);
  const decision = String(aiDecision?.decision || '見送り');
  const lossPenalty = Math.min(6, toNumber(losingStreak, 0)) * 0.08;

  const score =
    (points / 5) * 0.34 +
    Math.max(0, (expectedValue - 80) / 80) * 0.18 +
    Math.max(0, (roi - 80) / 80) * 0.16 +
    Math.max(0, hitRate / 100) * 0.1 +
    Math.max(-0.1, Math.min(0.1, profit / 5000)) * 0.05 +
    Math.max(0.7, Math.min(1.4, performanceWeight)) * 0.08 +
    (buyable ? 0.08 : -0.03) +
    (decision === '買い' ? 0.06 : decision === '少額' ? 0.02 : -0.05) +
    clamp(venueBias, -0.5, 0.5) * 0.2 +
    clamp(conditionBias, -0.5, 0.5) * 0.18 +
    clamp(pairBias, -0.5, 0.5) * 0.14 -
    lossPenalty;

  return Math.max(0, Math.round(score * 1000) / 1000);
}

function summarizeReasons({ condition, topCoach, supportRows, biasNote }) {
  const reasons = [];
  if (condition?.conditionLabel) {
    reasons.push(`${condition.conditionLabel}の補正を反映`);
  }
  if (topCoach?.roleName) {
    reasons.push(`${topCoach.roleName}を最終採用`);
  }
  if (supportRows.length) {
    reasons.push(`次点は${supportRows[0].roleName}`);
  }
  if (biasNote) {
    reasons.push(biasNote);
  }
  return reasons.join(' / ');
}

function buildHeadCoach(prediction = {}) {
  const conference = buildAiConference(prediction || {});
  const condition = classifyRaceCondition(prediction || {});
  const store = readStore();
  const venueNode = store.venue[condition.venueId] || { trustBias: 0, buyBias: 0, riskBias: 0, scoreBias: 0, sampleCount: 0 };
  const conditionNode = store.condition[condition.conditionKey] || { trustBias: 0, buyBias: 0, riskBias: 0, scoreBias: 0, sampleCount: 0 };
  const pairNode = store.venueCondition[`${condition.venueId}::${condition.conditionKey}`] || { trustBias: 0, buyBias: 0, riskBias: 0, scoreBias: 0, sampleCount: 0 };
  const leagueRows = readLeagueHistory();

  const aiJudgements = (conference?.aiDecisions || []).map((aiDecision) => {
    const roleRow = (conference?.roleRanking || []).find((row) => String(row?.roleId || '') === String(aiDecision?.roleId || '')) || {};
    const aiId = String(roleRow?.mappedAiId || '');
    const maxLosingStreak = calcMaxLosingStreak(leagueRows, aiId);
    const trustScore = buildTrustScore({
      aiDecision,
      roleRow,
      venueBias: venueNode.trustBias,
      conditionBias: conditionNode.trustBias,
      pairBias: pairNode.trustBias,
      losingStreak: maxLosingStreak
    });

    return {
      ...aiDecision,
      aiId,
      trustScore,
      maxLosingStreak,
      roi: toNumber(roleRow?.roi, 0),
      profit: toNumber(roleRow?.profit, 0),
      hitRate: toNumber(roleRow?.hitRate, 0),
      performanceWeight: toNumber(roleRow?.weight, 1),
      mappedAiName: String(roleRow?.mappedAiName || aiDecision?.roleName || ''),
      bias: {
        venue: venueNode.trustBias,
        condition: conditionNode.trustBias,
        pair: pairNode.trustBias
      }
    };
  }).sort((a, b) => b.trustScore - a.trustScore || b.points - a.points);

  const topCoach = aiJudgements[0] || null;
  const supportRows = aiJudgements.slice(1, 4);
  const biasNote = [
    venueNode.sampleCount ? '会場履歴を参照' : '',
    conditionNode.sampleCount ? '条件履歴を参照' : '',
    pairNode.sampleCount ? '会場×条件の補正あり' : ''
  ].filter(Boolean).join(' / ');
  const topExpectedValue = toNumber(topCoach?.expectedValue, 0);
  const topTrustScore = toNumber(topCoach?.trustScore, 0);
  const finalDecision =
    topTrustScore >= 1.25 && topCoach?.buyable ? '買い'
      : topTrustScore >= 0.9 && topCoach?.buyable ? '少額'
        : '見送り';
  const purchaseAmount = finalDecision === '買い' ? 2000 : finalDecision === '少額' ? 1000 : 0;
  const confidenceStars = Math.max(1, Math.min(5, Math.round((topTrustScore + Math.min(1.2, topExpectedValue / 160)) * 2)));
  const summary = topCoach
    ? `${topCoach.roleName}を採用。${topCoach.reason || ''}`.trim()
    : '採用AIなし';

  return {
    success: true,
    evaluatedAt: new Date().toISOString(),
    venueId: condition.venueId,
    raceNo: String(prediction?.raceNo || ''),
    condition,
    aiJudgements,
    coach: {
      trustedRoleId: topCoach?.roleId || '',
      trustedRoleName: topCoach?.roleName || '',
      trustedAiId: topCoach?.aiId || '',
      trustedAiName: topCoach?.mappedAiName || topCoach?.roleName || '',
      finalDecision,
      purchaseAmount,
      confidenceStars,
      trustScore: topTrustScore,
      expectedValue: topExpectedValue,
      reason: summarizeReasons({ condition, topCoach, supportRows, biasNote }),
      summary,
      support: supportRows.map((row) => ({
        roleId: row.roleId,
        roleName: row.roleName,
        trustScore: row.trustScore,
        reason: row.reason,
        roi: row.roi,
        hitRate: row.hitRate,
        maxLosingStreak: row.maxLosingStreak
      }))
    },
    learning: {
      venue: venueNode,
      condition: conditionNode,
      venueCondition: pairNode
    },
    roleRanking: conference?.roleRanking || []
  };
}

module.exports = {
  buildHeadCoach,
  classifyRaceCondition,
  updateHeadCoachLearning
};