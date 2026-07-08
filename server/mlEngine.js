const fs = require('fs');
const path = require('path');
const { buildWeatherContext } = require('./weatherEngine');
const { getVenueStats, getVenueStatistics, normalizeWindDirection } = require('./historyDatabaseEngine');

const MODEL_PATH = path.join(__dirname, 'model.json');
const RACE_DATABASE_PATH = path.join(__dirname, 'raceDatabase.json');
const MODEL_VERSION = 1;
const CLASS_COUNT = 6;
const FEATURE_NAMES = [
  'nationalWinRate',
  'localWinRate',
  'exhibitionTime',
  'st',
  'motorRate',
  'boatRate',
  'windSpeed',
  'waveHeight',
  'airTemperature',
  'waterTemperature',
  'lane'
];

let modelCache = null;
let modelCacheMtime = 0;

function toNumber(value, fallback = 0) {
  const parsed = Number.parseFloat(String(value ?? '').replace(/[^0-9.+-]/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

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

function readModelFile() {
  if (!fs.existsSync(MODEL_PATH)) {
    return null;
  }

  try {
    const stat = fs.statSync(MODEL_PATH);
    if (modelCache && modelCacheMtime === stat.mtimeMs) {
      return modelCache;
    }
    const raw = fs.readFileSync(MODEL_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    modelCache = parsed && typeof parsed === 'object' ? parsed : null;
    modelCacheMtime = stat.mtimeMs;
    return modelCache;
  } catch (error) {
    return null;
  }
}

function writeModelFile(model) {
  const nextModel = model && typeof model === 'object' ? model : null;
  if (!nextModel) {
    return null;
  }
  fs.writeFileSync(MODEL_PATH, `${JSON.stringify(nextModel, null, 2)}\n`, 'utf8');
  const stat = fs.statSync(MODEL_PATH);
  modelCache = nextModel;
  modelCacheMtime = stat.mtimeMs;
  return nextModel;
}

function normalizeLane(value) {
  return Number(String(value || '').replace(/[^0-9]/g, '').trim()) || 0;
}

function normalizeTicket(value) {
  return String(value || '').replace(/[・\s/]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function extractWinnerLane(result) {
  const directOrder = normalizeTicket(result?.order || '');
  const source = directOrder || normalizeTicket((Array.isArray(result?.payouts) ? result.payouts.find((row) => String(row?.type || '') === '3連単')?.ticket : '') || '');
  const lane = normalizeLane(source.split('-')[0]);
  return lane >= 1 && lane <= 6 ? lane : 0;
}

function getRaceEntries(race) {
  if (Array.isArray(race?.entries) && race.entries.length > 0) {
    return race.entries;
  }
  if (Array.isArray(race?.beforeInfo?.entries) && race.beforeInfo.entries.length > 0) {
    return race.beforeInfo.entries;
  }
  return [];
}

function getLaneEntry(race, lane) {
  const entries = getRaceEntries(race);
  const numericLane = Number(lane);
  return entries.find((entry, index) => normalizeLane(entry?.lane || entry?.boat || index + 1) === numericLane) || null;
}

function buildFeatureVector(race, lane) {
  const entry = getLaneEntry(race, lane) || {};
  const beforeInfo = race?.beforeInfo || {};
  const laneNo = Number(lane) || 0;
  const windSpeed = toNumber(beforeInfo?.windSpeed, 0);
  const waveHeight = toNumber(beforeInfo?.waveHeight, 0);
  const airTemperature = toNumber(beforeInfo?.airTemperature, 0);
  const waterTemperature = toNumber(beforeInfo?.waterTemperature, 0);

  return [
    toNumber(entry?.nationalWinRate ?? entry?.nationalWin ?? 0, 0),
    toNumber(entry?.localWinRate ?? entry?.localWin ?? 0, 0),
    toNumber(entry?.exhibitionTime ?? entry?.exhibition ?? entry?.exhibitionScore ?? 0, 0),
    toNumber(entry?.avgST ?? entry?.avgSt ?? entry?.startTiming ?? 0, 0),
    toNumber(entry?.motorRate ?? entry?.motor ?? 0, 0),
    toNumber(entry?.boatRate ?? entry?.boat ?? 0, 0),
    windSpeed,
    waveHeight,
    airTemperature,
    waterTemperature,
    laneNo
  ];
}

function buildTrainingRows(raceRows) {
  const rows = [];

  for (const race of Array.isArray(raceRows) ? raceRows : []) {
    const winnerLane = extractWinnerLane(race?.result);
    if (!winnerLane) {
      continue;
    }

    for (let lane = 1; lane <= CLASS_COUNT; lane += 1) {
      const features = buildFeatureVector(race, lane);
      rows.push({
        features,
        label: lane - 1,
        lane,
        winner: lane === winnerLane ? 1 : 0,
        venueId: String(race?.venueId || ''),
        raceNo: String(race?.raceNo || '')
      });
    }
  }

  return rows;
}

function buildFeatureStats(samples) {
  const featureCount = FEATURE_NAMES.length;
  const sums = Array.from({ length: featureCount }, () => 0);
  const sumsSq = Array.from({ length: featureCount }, () => 0);
  const means = Array.from({ length: featureCount }, () => 0);
  const stds = Array.from({ length: featureCount }, () => 1);

  for (const sample of samples) {
    for (let i = 0; i < featureCount; i += 1) {
      const value = toNumber(sample.features?.[i], 0);
      sums[i] += value;
      sumsSq[i] += value * value;
    }
  }

  for (let i = 0; i < featureCount; i += 1) {
    const mean = samples.length > 0 ? sums[i] / samples.length : 0;
    const variance = samples.length > 0 ? Math.max(0, (sumsSq[i] / samples.length) - (mean * mean)) : 0;
    means[i] = mean;
    stds[i] = variance > 0 ? Math.max(1e-6, Math.sqrt(variance)) : 1;
  }

  return { means, stds };
}

function standardize(features, means, stds) {
  return features.map((value, index) => {
    const mean = means[index] ?? 0;
    const std = stds[index] ?? 1;
    return (toNumber(value, 0) - mean) / std;
  });
}

function softmax(logits) {
  const maxLogit = Math.max(...logits);
  const exps = logits.map((logit) => Math.exp(logit - maxLogit));
  const sum = exps.reduce((total, value) => total + value, 0) || 1;
  return exps.map((value) => value / sum);
}

function initWeights(featureCount) {
  return Array.from({ length: CLASS_COUNT }, () => Array.from({ length: featureCount }, () => 0));
}

function initBias() {
  return Array.from({ length: CLASS_COUNT }, () => 0);
}

function predictProbabilitiesForSample(sample, model) {
  const x = standardize(sample.features, model.means, model.stds);
  const logits = model.weights.map((row, classIndex) => {
    let sum = model.bias[classIndex] || 0;
    for (let i = 0; i < row.length; i += 1) {
      sum += (row[i] || 0) * x[i];
    }
    return sum;
  });
  return softmax(logits);
}

function buildDisplayBreakdown(sample, probability) {
  const features = sample.features || [];
  const lane = Number(sample.lane) || 1;
  const national = toNumber(features[0], 0);
  const local = toNumber(features[1], 0);
  const exhibition = toNumber(features[2], 0);
  const st = toNumber(features[3], 0);
  const motor = toNumber(features[4], 0);
  const boat = toNumber(features[5], 0);
  const wind = toNumber(features[6], 0);
  const wave = toNumber(features[7], 0);
  const air = toNumber(features[8], 0);
  const water = toNumber(features[9], 0);

  return {
    lanePoint: Math.round((7 - lane) * 4 + probability * 8),
    exhibitionPoint: Math.max(0, Math.round((10 - exhibition) * 2)),
    stPoint: Math.max(0, Math.round((1.5 - st) * 10)),
    nationalPoint: Math.round(national * 1.5),
    localPoint: Math.round(local),
    motorPoint: Math.round(motor * 0.8),
    boatPoint: Math.round(boat * 0.5),
    weatherPoint: Math.round(clamp(2 - (wind * 0.12 + wave * 0.18 + Math.abs(air - water) * 0.04), 0, 2) * 10) / 10
  };
}

function buildScoreRows(sampleRows, model) {
  return sampleRows.map((sample) => {
    const probabilities = predictProbabilitiesForSample(sample, model);
    const probability = probabilities[sample.label] || 0;
    const score = Math.round(probability * 1000) / 10;
    return {
      lane: sample.lane,
      racerName: `${sample.lane}号艇`,
      className: '',
      nationalWinRate: toNumber(sample.features?.[0], 0),
      localWinRate: toNumber(sample.features?.[1], 0),
      avgST: toNumber(sample.features?.[3], 0),
      motorRate: toNumber(sample.features?.[4], 0),
      boatRate: toNumber(sample.features?.[5], 0),
      score,
      probability: Math.round(probability * 1000) / 10,
      rank: 0,
      mark: '',
      reason: ['学習モデル予測'],
      breakdown: buildDisplayBreakdown(sample, probability)
    };
  }).sort((a, b) => b.score - a.score || a.lane - b.lane).map((row, index) => ({
    ...row,
    rank: index + 1,
    mark: ['◎', '○', '▲', '△', '×'][index] || ''
  }));
}

function computeTrainingAccuracy(samples, model) {
  if (!samples.length) {
    return 0;
  }

  const raceCount = Math.floor(samples.length / CLASS_COUNT);
  let correct = 0;
  let evaluated = 0;
  for (let raceIndex = 0; raceIndex < samples.length; raceIndex += CLASS_COUNT) {
    const raceSamples = samples.slice(raceIndex, raceIndex + CLASS_COUNT);
    if (raceSamples.length < CLASS_COUNT) {
      continue;
    }
    const scoreRows = buildScoreRows(raceSamples, model);
    const winnerLane = raceSamples.find((sample) => sample.winner === 1)?.lane || 0;
    if (winnerLane && scoreRows[0]?.lane === winnerLane) {
      correct += 1;
    }
    evaluated += 1;
  }

  return evaluated > 0 ? Math.round((correct / evaluated) * 1000) / 10 : 0;
}

function trainModel(options = {}) {
  const raceRows = Array.isArray(options.raceRows) ? options.raceRows : readJsonArray(RACE_DATABASE_PATH);
  const samples = buildTrainingRows(raceRows);

  if (samples.length === 0) {
    const emptyModel = {
      version: MODEL_VERSION,
      trainedAt: new Date().toISOString(),
      sampleCount: 0,
      featureNames: FEATURE_NAMES,
      means: Array.from({ length: FEATURE_NAMES.length }, () => 0),
      stds: Array.from({ length: FEATURE_NAMES.length }, () => 1),
      weights: initWeights(FEATURE_NAMES.length),
      bias: initBias(),
      trainingAccuracy: 0,
      message: 'raceDatabase.json に学習データがありません'
    };
    writeModelFile(emptyModel);
    return emptyModel;
  }

  const { means, stds } = buildFeatureStats(samples);
  const featureCount = FEATURE_NAMES.length;
  const weights = initWeights(featureCount);
  const bias = initBias();
  const learningRate = 0.08;
  const epochs = Math.max(80, Math.min(220, Math.floor(samples.length / 8)));
  const regularization = 0.0008;

  for (let epoch = 0; epoch < epochs; epoch += 1) {
    const gradW = initWeights(featureCount);
    const gradB = initBias();

    for (const sample of samples) {
      const x = standardize(sample.features, means, stds);
      const logits = weights.map((row, classIndex) => {
        let sum = bias[classIndex] || 0;
        for (let i = 0; i < featureCount; i += 1) {
          sum += (row[i] || 0) * x[i];
        }
        return sum;
      });
      const probabilities = softmax(logits);

      for (let classIndex = 0; classIndex < CLASS_COUNT; classIndex += 1) {
        const target = classIndex === sample.label ? 1 : 0;
        const diff = probabilities[classIndex] - target;
        gradB[classIndex] += diff;
        for (let i = 0; i < featureCount; i += 1) {
          gradW[classIndex][i] += diff * x[i];
        }
      }
    }

    const sampleSize = samples.length;
    for (let classIndex = 0; classIndex < CLASS_COUNT; classIndex += 1) {
      bias[classIndex] -= learningRate * (gradB[classIndex] / sampleSize);
      for (let i = 0; i < featureCount; i += 1) {
        const penalty = regularization * weights[classIndex][i];
        weights[classIndex][i] -= learningRate * ((gradW[classIndex][i] / sampleSize) + penalty);
      }
    }
  }

  const model = {
    version: MODEL_VERSION,
    trainedAt: new Date().toISOString(),
    sampleCount: samples.length,
    featureNames: FEATURE_NAMES,
    means,
    stds,
    weights,
    bias,
    trainingAccuracy: computeTrainingAccuracy(samples, { means, stds, weights, bias })
  };

  writeModelFile(model);
  return model;
}

function predictModel({ entries, beforeInfo, odds } = {}) {
  const model = readModelFile();
  if (!model || !Array.isArray(model.weights) || !Array.isArray(model.bias)) {
    return null;
  }

  const race = {
    entries: Array.isArray(entries) ? entries : [],
    beforeInfo: beforeInfo || {},
    odds: odds || {}
  };

  const sampleRows = [];
  for (let lane = 1; lane <= CLASS_COUNT; lane += 1) {
    sampleRows.push({
      lane,
      label: lane - 1,
      features: buildFeatureVector(race, lane)
    });
  }

  const scoreRows = buildScoreRows(sampleRows, model);
  const weatherContext = buildWeatherContext(beforeInfo, odds);
  const venueId = String(beforeInfo?.venueId || entries?.[0]?.venueId || '');
  const historyStats = venueId ? { venueStats: getVenueStats(venueId), appliedCorrections: [] } : { venueStats: { totalRaces: 0, lane1WinRate: 0, laneWinRates: {} }, appliedCorrections: [] };
  const statisticsContext = venueId ? getVenueStatistics(venueId) : { venueId: '', totalRaces: 0, lane1WinRate: 0, laneWinRates: {}, weatherLaneWinRates: {} };

  return {
    available: true,
    model,
    score: scoreRows,
    ranked: scoreRows,
    weatherContext,
    statisticsContext,
    historyStats,
    weights: scoreRows.map((row) => ({ lane: row.lane, probability: row.probability }))
  };
}

function getModelStatus() {
  const model = readModelFile();
  if (!model) {
    return {
      available: false,
      modelPath: MODEL_PATH,
      trainedAt: '',
      sampleCount: 0,
      trainingAccuracy: 0,
      featureCount: FEATURE_NAMES.length
    };
  }

  return {
    available: true,
    modelPath: MODEL_PATH,
    trainedAt: String(model.trainedAt || ''),
    sampleCount: Number(model.sampleCount || 0),
    trainingAccuracy: Number(model.trainingAccuracy || 0),
    featureCount: Array.isArray(model.featureNames) ? model.featureNames.length : FEATURE_NAMES.length,
    version: Number(model.version || MODEL_VERSION)
  };
}

module.exports = {
  trainModel,
  predictModel,
  getModelStatus,
  readModelFile
};