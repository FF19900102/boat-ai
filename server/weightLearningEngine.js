const fs = require('fs');
const path = require('path');
const { toNumber } = require('./weatherEngine');

const WEIGHTS_PATH = path.join(__dirname, 'aiWeights.json');
const LEAGUE_HISTORY_PATH = path.join(__dirname, 'leagueHistory.json');

const DEFAULT_WEIGHT_STORE = {
  'AI-01': {
    aiId: 'AI-01',
    aiName: '展示重視AI',
    strategy: '展示タイムを重視',
    laneWeight: 1,
    exhibitionWeight: 1.45,
    stWeight: 0.95,
    nationalWeight: 0.9,
    localWeight: 0.9,
    motorWeight: 0.85,
    boatWeight: 0.8,
    weatherWeight: 1,
    oddsWeight: 1,
    lastDelta: {},
    updatedAt: null
  },
  'AI-02': {
    aiId: 'AI-02',
    aiName: 'ST重視AI',
    strategy: 'STを重視',
    laneWeight: 1,
    exhibitionWeight: 0.95,
    stWeight: 1.5,
    nationalWeight: 0.95,
    localWeight: 0.9,
    motorWeight: 0.85,
    boatWeight: 0.8,
    weatherWeight: 1,
    oddsWeight: 1,
    lastDelta: {},
    updatedAt: null
  },
  'AI-03': {
    aiId: 'AI-03',
    aiName: 'モーター重視AI',
    strategy: 'モーター2連率を重視',
    laneWeight: 0.95,
    exhibitionWeight: 0.9,
    stWeight: 0.9,
    nationalWeight: 0.95,
    localWeight: 0.9,
    motorWeight: 1.8,
    boatWeight: 1.2,
    weatherWeight: 1,
    oddsWeight: 1,
    lastDelta: {},
    updatedAt: null
  },
  'AI-04': {
    aiId: 'AI-04',
    aiName: '期待値重視AI',
    strategy: '期待値を重視',
    laneWeight: 0.9,
    exhibitionWeight: 1,
    stWeight: 1,
    nationalWeight: 1.05,
    localWeight: 1,
    motorWeight: 1,
    boatWeight: 0.95,
    weatherWeight: 1.05,
    oddsWeight: 1.4,
    lastDelta: {},
    updatedAt: null
  },
  'AI-05': {
    aiId: 'AI-05',
    aiName: '穴狙いAI',
    strategy: '穴狙い',
    laneWeight: 0.7,
    exhibitionWeight: 1,
    stWeight: 1.1,
    nationalWeight: 0.95,
    localWeight: 1,
    motorWeight: 1.25,
    boatWeight: 1.15,
    weatherWeight: 1.25,
    oddsWeight: 1.25,
    lastDelta: {},
    updatedAt: null
  }
};

const PRIMARY_WEIGHT_MAP = {
  'AI-01': 'exhibitionWeight',
  'AI-02': 'stWeight',
  'AI-03': 'motorWeight',
  'AI-04': 'oddsWeight',
  'AI-05': 'weatherWeight'
};

const WEIGHT_LABELS = {
  laneWeight: '枠番',
  exhibitionWeight: '展示タイム',
  stWeight: 'ST',
  nationalWeight: '全国勝率',
  localWeight: '当地勝率',
  motorWeight: 'モーター評価',
  boatWeight: 'ボート評価',
  weatherWeight: '天候補正',
  oddsWeight: 'オッズ評価'
};

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureWeightsFile() {
  if (!fs.existsSync(WEIGHTS_PATH)) {
    fs.writeFileSync(WEIGHTS_PATH, `${JSON.stringify(DEFAULT_WEIGHT_STORE, null, 2)}\n`, 'utf8');
  }
}

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

function readAiWeights() {
  ensureWeightsFile();
  try {
    const raw = fs.readFileSync(WEIGHTS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : deepClone(DEFAULT_WEIGHT_STORE);
  } catch (error) {
    return deepClone(DEFAULT_WEIGHT_STORE);
  }
}

function writeAiWeights(store) {
  fs.writeFileSync(WEIGHTS_PATH, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
}

function resetAiWeights() {
  const defaults = deepClone(DEFAULT_WEIGHT_STORE);
  writeAiWeights(defaults);
  return defaults;
}

function mapToScoreWeights(entry) {
  return {
    lane: toNumber(entry?.laneWeight, 1),
    exhibition: toNumber(entry?.exhibitionWeight, 1),
    st: toNumber(entry?.stWeight, 1),
    national: toNumber(entry?.nationalWeight, 1),
    local: toNumber(entry?.localWeight, 1),
    motor: toNumber(entry?.motorWeight, 1),
    boat: toNumber(entry?.boatWeight, 1),
    weather: toNumber(entry?.weatherWeight, 1),
    odds: toNumber(entry?.oddsWeight, 1)
  };
}

function clampWeight(value) {
  return Math.max(0.2, Math.min(3.0, Math.round(value * 10) / 10));
}

function buildDelta(row) {
  const roi = toNumber(row?.roi, 0);
  const profit = toNumber(row?.profit, 0);
  const hit = Boolean(row?.hit);
  const magnitude = Math.max(0.1, Math.min(1, Math.round((Math.abs(roi - 100) / 50 + (hit ? 0.2 : 0.1)) * 10) / 10));
  const sign = hit || profit > 0 ? 1 : -1;
  return Math.round(sign * magnitude * 10) / 10;
}

function applyDeltaSet(current, deltaValue, aiId) {
  const primary = PRIMARY_WEIGHT_MAP[aiId] || 'exhibitionWeight';
  const result = {};
  const supportPositive = deltaValue > 0 ? 0.1 : -0.1;
  result[primary] = deltaValue;
  result.laneWeight = primary === 'laneWeight' ? deltaValue : supportPositive;
  result.nationalWeight = primary === 'nationalWeight' ? deltaValue : 0;
  result.localWeight = primary === 'localWeight' ? deltaValue : 0;
  result.motorWeight = primary === 'motorWeight' ? deltaValue : 0;
  result.weatherWeight = primary === 'weatherWeight' ? deltaValue : 0;
  result.oddsWeight = primary === 'oddsWeight' ? deltaValue : 0;
  result.boatWeight = primary === 'boatWeight' ? deltaValue : 0;
  result.stWeight = primary === 'stWeight' ? deltaValue : 0;
  result.exhibitionWeight = primary === 'exhibitionWeight' ? deltaValue : 0;

  const next = { ...current };
  const lastDelta = {};
  for (const key of ['laneWeight', 'exhibitionWeight', 'stWeight', 'nationalWeight', 'localWeight', 'motorWeight', 'boatWeight', 'weatherWeight', 'oddsWeight']) {
    const delta = toNumber(result[key], 0);
    if (delta !== 0) {
      next[key] = clampWeight(toNumber(current[key], 1) + delta);
      lastDelta[key] = delta;
    }
  }
  next.lastDelta = lastDelta;
  next.updatedAt = new Date().toISOString();
  return next;
}

function updateAiWeightsFromLeagueResults(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  const store = readAiWeights();
  const comments = [];

  for (const row of rows) {
    const aiId = String(row?.aiId || '');
    if (!aiId || !store[aiId]) {
      continue;
    }
    const deltaValue = buildDelta(row);
    store[aiId] = applyDeltaSet(store[aiId], deltaValue, aiId);
    const primary = PRIMARY_WEIGHT_MAP[aiId] || 'exhibitionWeight';
    const label = WEIGHT_LABELS[primary] || primary;
    const signed = deltaValue > 0 ? `+${deltaValue.toFixed(1)}` : deltaValue.toFixed(1);
    comments.push(`${store[aiId].aiName}: ${label}の重みを${signed}しました。`);
  }

  writeAiWeights(store);
  return comments;
}

function getRecent20Roi(aiId) {
  const rows = readLeagueHistory().filter((row) => String(row?.aiId || '') === String(aiId || '')).slice(0, 20);
  if (!rows.length) {
    return 0;
  }
  const avg = rows.reduce((sum, row) => sum + toNumber(row?.roi, 0), 0) / rows.length;
  return Math.round(avg * 10) / 10;
}

function getWeightsSnapshot() {
  const store = readAiWeights();
  const result = {};
  for (const [aiId, row] of Object.entries(store)) {
    result[aiId] = {
      aiId,
      aiName: row.aiName,
      strategy: row.strategy,
      laneWeight: row.laneWeight,
      exhibitionWeight: row.exhibitionWeight,
      stWeight: row.stWeight,
      nationalWeight: row.nationalWeight,
      localWeight: row.localWeight,
      motorWeight: row.motorWeight,
      boatWeight: row.boatWeight,
      weatherWeight: row.weatherWeight,
      oddsWeight: row.oddsWeight,
      lastDelta: row.lastDelta || {},
      recent20Roi: getRecent20Roi(aiId),
      updatedAt: row.updatedAt || null
    };
  }
  return result;
}

module.exports = {
  DEFAULT_WEIGHT_STORE,
  readAiWeights,
  writeAiWeights,
  resetAiWeights,
  mapToScoreWeights,
  updateAiWeightsFromLeagueResults,
  getWeightsSnapshot
};