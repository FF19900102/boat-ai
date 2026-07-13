const { buildWeatherContext, calcWeatherBonus, normalizeLane, toNumber } = require('./weatherEngine');
const {
  getVenueStats,
  getLaneWinRate,
  getWeatherStats,
  getMotorStats,
  getRacerStats,
  normalizeWindDirection
} = require('./historyDatabaseEngine');

const LANE_POINTS = {
  1: 25,
  2: 20,
  3: 16,
  4: 12,
  5: 9,
  6: 6
};

const DEFAULT_WEIGHTS = {
  lane: 1,
  exhibition: 1,
  st: 1,
  national: 1,
  local: 1,
  motor: 1,
  boat: 1,
  weather: 1
};

const SCORE_CORRECTION_LIMITS = {
  minVenueSample: 60,
  minWeatherSample: 25,
  minMotorSample: 30,
  minRacerSample: 30
};

function classFactor(className) {
  const c = String(className || '').toUpperCase();
  if (c === 'A1') return 1.08;
  if (c === 'A2') return 1.04;
  if (c === 'B1') return 1.0;
  if (c === 'B2') return 0.96;
  return 1.0;
}

function normalize(rows, getter, reverse = false) {
  const values = rows.map((row) => toNumber(getter(row), 0));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  return rows.map((row, index) => {
    if (range <= 0) {
      return 0.5;
    }
    const raw = (values[index] - min) / range;
    return reverse ? 1 - raw : raw;
  });
}

function addReason(reasons, label, value, maxPoint) {
  reasons.push(`${label} ${value.toFixed(1)} / ${maxPoint}`);
}

function buildCandidates(entries, beforeInfo) {
  const beforeEntries = Array.isArray(beforeInfo?.entries) ? beforeInfo.entries : [];

  const source = Array.isArray(entries) && entries.length > 0
    ? entries
    : [1, 2, 3, 4, 5, 6].map((lane) => ({ lane: String(lane), className: '', racerName: `${lane}号艇` }));

  return source.map((entry, idx) => {
    const lane = Number(normalizeLane(entry.lane || entry.boat || idx + 1)) || idx + 1;
    const beforeEntry = beforeEntries.find((b) => Number(normalizeLane(b.lane)) === lane) || {};

    const nat = toNumber(entry.nationalWinRate ?? entry.nationalWin, 0);
    const local = toNumber(entry.localWinRate ?? entry.localWin, 0);
    const st = toNumber(beforeEntry.startTiming ?? entry.avgST ?? entry.avgSt, 0);
    const exhibition = toNumber(beforeEntry.exhibitionTime ?? entry.exhibitionTime, 0);
    const motor = toNumber(entry.motorRate, 0);
    const boat = toNumber(entry.boatRate, 0);
    const factor = classFactor(entry.className);

    return {
      lane,
      racerName: entry.racerName || entry.name || `${lane}号艇`,
      registrationNo: String(entry.registrationNo || ''),
      motorNo: String(entry.motorNo || ''),
      className: entry.className || '',
      nationalWinRate: nat,
      localWinRate: local,
      avgST: toNumber(entry.avgST ?? entry.avgSt, 0),
      motorRate: motor,
      boatRate: boat,
      natAdjusted: nat * factor,
      localAdjusted: local * factor,
      st,
      exhibition,
      motor,
      boat,
      factor
    };
  });
}

function assignMarks(sortedRows) {
  const marks = ['◎', '○', '▲', '△', '×'];
  return sortedRows.map((row, index) => ({
    ...row,
    mark: marks[index] || ''
  }));
}

function inferVenueId(entries, beforeInfo) {
  return entries?.[0]?.venueId || beforeInfo?.venueId || '';
}

function scoreRace({ entries, beforeInfo, odds, weights = {} }) {
  const rows = buildCandidates(entries, beforeInfo);
  const weatherContext = buildWeatherContext(beforeInfo, odds);
  const activeWeights = { ...DEFAULT_WEIGHTS, ...(weights || {}) };
  const venueId = inferVenueId(entries, beforeInfo);
  const venueStats = venueId ? getVenueStats(venueId) : { venueId: '', totalRaces: 0, lane1WinRate: 0, laneWinRates: {} };
  const weatherStats = venueId
    ? getWeatherStats(venueId, beforeInfo?.weather, beforeInfo?.windSpeed, beforeInfo?.waveHeight)
    : { totalRaces: 0, laneWinRates: {}, outsideWinRate: 0 };
  const windSpeed = toNumber(beforeInfo?.windSpeed, 0);
  const windKey = normalizeWindDirection(beforeInfo?.windDirection);
  const motorStatsCache = new Map();
  const racerStatsCache = new Map();
  const correctionMessages = new Set();
  const lowSampleNotes = new Set();

  if (venueStats.totalRaces > 0 && venueStats.lane1WinRate >= 55) {
    correctionMessages.add(`${venueId}では1号艇勝率が高いため内枠を加点`);
  }
  if (weatherStats.totalRaces >= 5 && windSpeed >= 5 && weatherStats.outsideWinRate < 20) {
    correctionMessages.add(`風速${windSpeed}m条件では外枠成績が低いため5号艇以降を減点`);
  }

  const exNorm = normalize(rows, (r) => r.exhibition || 0, true);
  const stNorm = normalize(rows, (r) => r.st || 0, true);
  const natNorm = normalize(rows, (r) => r.natAdjusted || 0, false);
  const localNorm = normalize(rows, (r) => r.localAdjusted || 0, false);
  const motorNorm = normalize(rows, (r) => r.motor || 0, false);
  const boatNorm = normalize(rows, (r) => r.boat || 0, false);

  const scored = rows.map((row, idx) => {
    const lanePoint = (LANE_POINTS[row.lane] || 0) * activeWeights.lane;
    const exhibitionPoint = exNorm[idx] * 20 * activeWeights.exhibition;
    const stPoint = stNorm[idx] * 15 * activeWeights.st;
    const natPoint = natNorm[idx] * 15 * activeWeights.national;
    const localPoint = localNorm[idx] * 10 * activeWeights.local;
    const motorPoint = motorNorm[idx] * 8 * activeWeights.motor;
    const boatPoint = boatNorm[idx] * 5 * activeWeights.boat;
    const weatherPoint = calcWeatherBonus(row.lane, weatherContext) * activeWeights.weather;
    const historicalLaneRate = venueId ? getLaneWinRate(venueId, row.lane) : 0;
    const laneHistoryPoint = venueStats.totalRaces >= SCORE_CORRECTION_LIMITS.minVenueSample
      ? Math.max(-2, Math.min(8, ((historicalLaneRate - 16.7) / 50) * 8))
      : 0;
    const historicalWeatherRate = toNumber(weatherStats?.laneWinRates?.[String(row.lane)], 0);
    const weatherHistoryPoint = weatherStats.totalRaces >= SCORE_CORRECTION_LIMITS.minWeatherSample
      ? Math.max(-1.5, Math.min(3, ((historicalWeatherRate - 16.7) / 50) * 3))
      : 0;
    const outsidePenaltyPoint = weatherStats.totalRaces >= 5 && windSpeed >= 5 && row.lane >= 5 && weatherStats.outsideWinRate < 20
      ? -1.8
      : 0;

    const motorNo = String(row.motorNo || '');
    const motorStats = motorNo
      ? (motorStatsCache.get(motorNo) || getMotorStats(motorNo))
      : { appearances: 0, winRate: 0 };
    if (motorNo && !motorStatsCache.has(motorNo)) {
      motorStatsCache.set(motorNo, motorStats);
    }
    const motorHistoryPoint = motorStats.appearances >= SCORE_CORRECTION_LIMITS.minMotorSample
      ? Math.max(-1, Math.min(3, ((toNumber(motorStats.winRate, 0) - 16.7) / 40) * 3))
      : 0;

    const registrationNo = String(row.registrationNo || '');
    const racerStats = registrationNo
      ? (racerStatsCache.get(registrationNo) || getRacerStats(registrationNo))
      : { starts: 0, winRate: 0 };
    if (registrationNo && !racerStatsCache.has(registrationNo)) {
      racerStatsCache.set(registrationNo, racerStats);
    }
    const racerHistoryPoint = racerStats.starts >= SCORE_CORRECTION_LIMITS.minRacerSample
      ? Math.max(-1.5, Math.min(3, ((toNumber(racerStats.winRate, 0) - 16.7) / 40) * 3))
      : 0;

    if (motorHistoryPoint >= 1.0 && motorNo) {
      correctionMessages.add(`モーター${motorNo}の過去成績が良いため加点`);
    }
    if (racerHistoryPoint >= 1.0 && registrationNo) {
      correctionMessages.add(`選手${registrationNo}の過去成績が良いため加点`);
    }

    const total = Math.max(
      0,
      Math.min(
        100,
        lanePoint + exhibitionPoint + stPoint + natPoint + localPoint + motorPoint + boatPoint + weatherPoint
          + laneHistoryPoint + weatherHistoryPoint + outsidePenaltyPoint + motorHistoryPoint + racerHistoryPoint
      )
    );

    const reasons = [];
    addReason(reasons, '枠番', lanePoint, 25);
    addReason(reasons, '展示タイム', exhibitionPoint, 20);
    addReason(reasons, 'ST', stPoint, 15);
    addReason(reasons, '全国勝率', natPoint, 15);
    addReason(reasons, '当地勝率', localPoint, 10);
    addReason(reasons, 'モーター2連率', motorPoint, 8);
    addReason(reasons, 'ボート2連率', boatPoint, 5);
    addReason(reasons, '天候補正', weatherPoint, 2);
    if (venueStats.totalRaces >= SCORE_CORRECTION_LIMITS.minVenueSample) {
      addReason(reasons, '過去統計補正', laneHistoryPoint, 8);
    }
    if (weatherStats.totalRaces >= SCORE_CORRECTION_LIMITS.minWeatherSample) {
      addReason(reasons, '天候統計補正', weatherHistoryPoint, 3);
    }
    if (outsidePenaltyPoint) {
      addReason(reasons, '強風外枠補正', outsidePenaltyPoint, 2);
    }
    if (motorHistoryPoint) {
      addReason(reasons, 'モーター統計補正', motorHistoryPoint, 3);
    }
    if (racerHistoryPoint) {
      addReason(reasons, '選手統計補正', racerHistoryPoint, 3);
    }

    return {
      lane: row.lane,
      racerName: row.racerName,
      className: row.className,
      nationalWinRate: Math.round(row.nationalWinRate * 100) / 100,
      localWinRate: Math.round(row.localWinRate * 100) / 100,
      avgST: Math.round(row.avgST * 100) / 100,
      motorRate: Math.round(row.motorRate * 100) / 100,
      boatRate: Math.round(row.boatRate * 100) / 100,
      score: Math.round(total * 10) / 10,
      rank: 0,
      mark: '',
      reason: reasons,
      breakdown: {
        lanePoint: Math.round(lanePoint * 10) / 10,
        exhibitionPoint: Math.round(exhibitionPoint * 10) / 10,
        stPoint: Math.round(stPoint * 10) / 10,
        nationalPoint: Math.round(natPoint * 10) / 10,
        localPoint: Math.round(localPoint * 10) / 10,
        motorPoint: Math.round(motorPoint * 10) / 10,
        boatPoint: Math.round(boatPoint * 10) / 10,
        weatherPoint: Math.round(weatherPoint * 10) / 10,
        laneHistoryPoint: Math.round(laneHistoryPoint * 10) / 10,
        weatherHistoryPoint: Math.round(weatherHistoryPoint * 10) / 10,
        outsidePenaltyPoint: Math.round(outsidePenaltyPoint * 10) / 10,
        motorHistoryPoint: Math.round(motorHistoryPoint * 10) / 10,
        racerHistoryPoint: Math.round(racerHistoryPoint * 10) / 10
      }
    };
  });

  const sorted = [...scored].sort((a, b) => b.score - a.score || a.lane - b.lane);
  const ranked = assignMarks(sorted).map((row, idx) => ({ ...row, rank: idx + 1 }));
  const scoreByLane = [...ranked].sort((a, b) => a.lane - b.lane);

  if (venueStats.totalRaces > 0 && venueStats.totalRaces < SCORE_CORRECTION_LIMITS.minVenueSample) {
    lowSampleNotes.add(`会場サンプル不足(${venueStats.totalRaces}件)`);
  }
  if (weatherStats.totalRaces > 0 && weatherStats.totalRaces < SCORE_CORRECTION_LIMITS.minWeatherSample) {
    lowSampleNotes.add(`天候サンプル不足(${weatherStats.totalRaces}件)`);
  }

  return {
    score: scoreByLane,
    ranked,
    weatherContext,
    statisticsContext: {
      venueId,
      totalRaces: venueStats.totalRaces,
      laneWinRates: venueStats.laneWinRates,
      weatherLaneWinRates: weatherStats.laneWinRates,
      windDirection: windKey
    },
    historyStats: {
      venueStats: {
        lane1WinRate: toNumber(venueStats.lane1WinRate, 0),
        totalRaces: venueStats.totalRaces
      },
      appliedCorrections: Array.from(correctionMessages),
      lowSampleNotes: Array.from(lowSampleNotes),
      samplePolicy: SCORE_CORRECTION_LIMITS
    }
  };
}

module.exports = {
  scoreRace,
  DEFAULT_WEIGHTS
};
