const fs = require('fs');
const path = require('path');
const { predictRace } = require('./aiEngine');
const { LEAGUE_PROFILES } = require('./leagueEngine');

const RACE_DATABASE_PATH = path.join(__dirname, 'raceDatabase.json');
const BACKTEST_HISTORY_PATH = path.join(__dirname, 'backtestHistory.json');
const MAX_BACKTEST_HISTORY_ENTRIES = 1000;

function ensureBacktestHistoryFile() {
  if (!fs.existsSync(BACKTEST_HISTORY_PATH)) {
    fs.writeFileSync(BACKTEST_HISTORY_PATH, '[]\n', 'utf8');
  }
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

function writeJsonArray(filePath, rows) {
  fs.writeFileSync(filePath, `${JSON.stringify(Array.isArray(rows) ? rows : [], null, 2)}\n`, 'utf8');
}

function readRaceDatabase() {
  return readJsonArray(RACE_DATABASE_PATH);
}

function readBacktestHistory() {
  ensureBacktestHistoryFile();
  return readJsonArray(BACKTEST_HISTORY_PATH);
}

function writeBacktestHistory(rows) {
  writeJsonArray(BACKTEST_HISTORY_PATH, rows.slice(0, MAX_BACKTEST_HISTORY_ENTRIES));
}

function appendBacktestHistory(rows) {
  const history = readBacktestHistory();
  writeBacktestHistory([...rows, ...history]);
}

function normalizeImportDate(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length === 8 ? digits : '';
}

function normalizeVenueIds(values) {
  const list = Array.isArray(values) ? values : [];
  const validIds = new Set(LEAGUE_PROFILES.map((profile) => String(profile.aiId || '')));
  const unique = [];
  const seen = new Set();

  for (const value of list) {
    const venueId = String(value || '').trim();
    if (!venueId || seen.has(venueId)) {
      continue;
    }
    seen.add(venueId);
    unique.push(venueId);
  }

  return unique;
}

function normalizeAiId(value) {
  const aiId = String(value || '').trim();
  return LEAGUE_PROFILES.some((profile) => profile.id === aiId) ? aiId : '';
}

function normalizeTicket(value) {
  return String(value || '')
    .replace(/[・\s/]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function extractActualOrder(race) {
  const directOrder = normalizeTicket(race?.result?.order || '');
  if (directOrder) {
    return directOrder;
  }

  const payouts = Array.isArray(race?.result?.payouts) ? race.result.payouts : [];
  const trifectaRow = payouts.find((row) => String(row?.type || '') === '3連単' && String(row?.ticket || ''));
  return normalizeTicket(trifectaRow?.ticket || '');
}

function filterRaceRows(raceRows, options = {}) {
  const dateFrom = normalizeImportDate(options.dateFrom);
  const dateTo = normalizeImportDate(options.dateTo);
  const venueIds = normalizeVenueIds(options.venueIds);

  return Array.isArray(raceRows)
    ? raceRows.filter((row) => {
      const date = String(row?.date || '');
      const venueId = String(row?.venueId || '');
      const resultOrder = String(row?.result?.order || '');
      if (dateFrom && date < dateFrom) {
        return false;
      }
      if (dateTo && date > dateTo) {
        return false;
      }
      if (venueIds.length > 0 && !venueIds.includes(venueId)) {
        return false;
      }
      return Boolean(resultOrder || extractActualOrder(row)) && Array.isArray(row?.entries) && row.entries.length > 0;
    })
    : [];
}

function parseActualExacta(order) {
  const parts = String(order || '').split('-').map((part) => String(part || '').trim()).filter(Boolean);
  return parts.length >= 2 ? `${parts[0]}-${parts[1]}` : '';
}

function isHonmeiLevel(roughLevel) {
  return String(roughLevel || '') === '本命';
}

function isAnaLevel(roughLevel) {
  return String(roughLevel || '') === '荒れ' || String(roughLevel || '') === '大荒れ';
}

function createAggregateState(profile, options) {
  return {
    aiId: profile.id,
    aiName: profile.aiName,
    strategy: profile.strategy,
    dateFrom: normalizeImportDate(options.dateFrom),
    dateTo: normalizeImportDate(options.dateTo),
    venueIds: normalizeVenueIds(options.venueIds),
    totalRaces: 0,
    hitCount: 0,
    trifectaHitCount: 0,
    exactaHitCount: 0,
    betCount: 0,
    betHitCount: 0,
    skippedCount: 0,
    skippedSuccessCount: 0,
    roughCount: 0,
    roughSuccessCount: 0,
    honmeiCount: 0,
    honmeiHitCount: 0,
    anaCount: 0,
    anaHitCount: 0,
    totalStake: 0,
    totalReturn: 0,
    totalProfit: 0,
    averageOddsTotal: 0,
    averageOddsCount: 0,
    averageExpectedValueTotal: 0,
    averageExpectedValueCount: 0,
    records: []
  };
}

function finalizeAggregate(state) {
  const totalRaces = state.totalRaces || 0;
  const betCount = state.betCount || 0;
  const totalStake = state.totalStake || 0;
  const totalReturn = state.totalReturn || 0;
  const averageOdds = state.averageOddsCount > 0 ? Math.round((state.averageOddsTotal / state.averageOddsCount) * 10) / 10 : 0;
  const averageExpectedValue = state.averageExpectedValueCount > 0 ? Math.round((state.averageExpectedValueTotal / state.averageExpectedValueCount) * 10) / 10 : 0;
  const hitRate = totalRaces > 0 ? Math.round((state.trifectaHitCount / totalRaces) * 1000) / 10 : 0;
  const trifectaHitRate = hitRate;
  const exactaHitRate = totalRaces > 0 ? Math.round((state.exactaHitCount / totalRaces) * 1000) / 10 : 0;
  const roi = totalStake > 0 ? Math.round((totalReturn / totalStake) * 1000) / 10 : 0;
  const profit = Math.round(state.totalProfit || 0);
  const skipSuccessRate = state.skippedCount > 0 ? Math.round((state.skippedSuccessCount / state.skippedCount) * 1000) / 10 : 0;
  const roughPredictionSuccessRate = state.roughCount > 0 ? Math.round((state.roughSuccessCount / state.roughCount) * 1000) / 10 : 0;
  const honmeiHitRate = state.honmeiCount > 0 ? Math.round((state.honmeiHitCount / state.honmeiCount) * 1000) / 10 : 0;
  const anaHitRate = state.anaCount > 0 ? Math.round((state.anaHitCount / state.anaCount) * 1000) / 10 : 0;

  return {
    aiId: state.aiId,
    aiName: state.aiName,
    strategy: state.strategy,
    dateFrom: state.dateFrom,
    dateTo: state.dateTo,
    venueIds: state.venueIds,
    totalRaces,
    hitRate,
    trifectaHitRate,
    exactaHitRate,
    roi,
    profit,
    averageOdds,
    averageExpectedValue,
    skipSuccessRate,
    roughPredictionSuccessRate,
    honmeiHitRate,
    anaHitRate,
    betCount,
    skippedCount: state.skippedCount,
    records: state.records
  };
}

async function evaluateRaceForProfile(race, profile) {
  const result = await predictRace(String(race?.venueId || ''), String(race?.raceNo || ''), {
    persistLearning: false,
    raceData: race
  });

  const leagueRow = Array.isArray(result?.league)
    ? result.league.find((row) => String(row?.aiId || '') === String(profile.id || ''))
    : null;

  return {
    result,
    leagueRow
  };
}

function buildRaceRecord(race, profile, leagueRow) {
  const topTicket = Array.isArray(leagueRow?.buyDetails) ? leagueRow.buyDetails[0] || {} : {};
  const scoreRows = Array.isArray(leagueRow?.scoreRows)
    ? [...leagueRow.scoreRows].sort((a, b) => Number(b?.score || 0) - Number(a?.score || 0) || Number(a?.lane || 0) - Number(b?.lane || 0))
    : [];
  const decision = String(leagueRow?.decision?.decision || '見送り');
  const roughLevel = String(leagueRow?.roughRace?.roughLevel || '本命');
  const actualOrder = extractActualOrder(race);
  const predictedExacta = scoreRows.length >= 2 ? `${scoreRows[0].lane}-${scoreRows[1].lane}` : '';
  const exactaHit = Boolean(parseActualExacta(actualOrder) && predictedExacta && parseActualExacta(actualOrder) === predictedExacta);
  const trifectaHit = Boolean(leagueRow?.hit);
  const stake = decision === '見送り' ? 0 : Number(leagueRow?.stake || 1000);
  const payout = decision === '見送り' ? 0 : Number(leagueRow?.payout || 0);
  const profit = decision === '見送り' ? 0 : Number.isFinite(Number(leagueRow?.profit)) ? Number(leagueRow?.profit) : (trifectaHit ? payout - stake : -stake);
  const roi = stake > 0 ? Math.round(((decision === '見送り' ? 0 : payout) / stake) * 1000) / 10 : 0;
  const hit = trifectaHit;

  return {
    aiId: profile.id,
    aiName: profile.aiName,
    venueId: String(race?.venueId || ''),
    raceNo: String(race?.raceNo || ''),
    date: String(race?.date || ''),
    topPick: String(leagueRow?.topPick || ''),
    combo: String(leagueRow?.buyDetails?.[0]?.combo || ''),
    decision,
    roughLevel,
    hit,
    exactaHit,
    trifectaHit,
    stake,
    payout,
    roi,
    profit,
    expectedValue: Number(topTicket?.expectedValue || leagueRow?.expectedValue || 0),
    odds: Number(topTicket?.odds || 0),
    confidence: Number(leagueRow?.confidence || 0),
    score: Number(leagueRow?.score || 0),
    skip: decision === '見送り',
    skipSuccess: decision === '見送り' && !hit,
    roughSuccess: isHonmeiLevel(roughLevel) ? hit : (isAnaLevel(roughLevel) ? !hit : !hit),
    honmeiHit: isHonmeiLevel(roughLevel) && hit,
    anaHit: isAnaLevel(roughLevel) && hit,
    totalRacesContribution: 1
  };
}

async function simulateProfile(profile, races, options) {
  const state = createAggregateState(profile, options);

  for (const race of races) {
    const { leagueRow } = await evaluateRaceForProfile(race, profile);
    if (!leagueRow) {
      continue;
    }

    const record = buildRaceRecord(race, profile, leagueRow);
    state.totalRaces += 1;
    state.trifectaHitCount += record.trifectaHit ? 1 : 0;
    state.exactaHitCount += record.exactaHit ? 1 : 0;
    state.hitCount += record.hit ? 1 : 0;
    state.betCount += record.skip ? 0 : 1;
    state.skippedCount += record.skip ? 1 : 0;
    state.skippedSuccessCount += record.skipSuccess ? 1 : 0;
    state.roughCount += record.roughLevel !== '本命' ? 1 : 0;
    state.roughSuccessCount += record.roughSuccess ? 1 : 0;
    state.honmeiCount += isHonmeiLevel(record.roughLevel) ? 1 : 0;
    state.honmeiHitCount += record.honmeiHit ? 1 : 0;
    state.anaCount += isAnaLevel(record.roughLevel) ? 1 : 0;
    state.anaHitCount += record.anaHit ? 1 : 0;
    state.totalStake += record.skip ? 0 : record.stake;
    state.totalReturn += record.skip ? 0 : (record.hit ? record.payout : 0);
    state.totalProfit += record.profit;
    state.averageOddsTotal += record.odds;
    state.averageOddsCount += record.odds > 0 ? 1 : 0;
    state.averageExpectedValueTotal += record.expectedValue;
    state.averageExpectedValueCount += record.expectedValue > 0 ? 1 : 0;
    state.records.push(record);
  }

  return finalizeAggregate(state);
}

function sortLeaderboard(rows) {
  return [...rows]
    .sort((a, b) => b.roi - a.roi || b.profit - a.profit || b.hitRate - a.hitRate || b.averageExpectedValue - a.averageExpectedValue)
    .map((row, index) => ({ rank: index + 1, ...row }));
}

async function runBacktest(options = {}) {
  const allRaces = readRaceDatabase();
  const races = filterRaceRows(allRaces, options);
  const profiles = LEAGUE_PROFILES.slice();

  const metricsByAi = [];
  for (const profile of profiles) {
    metricsByAi.push(await simulateProfile(profile, races, options));
  }

  const leaderboard = sortLeaderboard(metricsByAi.map((row) => ({
    aiId: row.aiId,
    aiName: row.aiName,
    strategy: row.strategy,
    totalRaces: row.totalRaces,
    hitRate: row.hitRate,
    trifectaHitRate: row.trifectaHitRate,
    exactaHitRate: row.exactaHitRate,
    roi: row.roi,
    profit: row.profit,
    averageOdds: row.averageOdds,
    averageExpectedValue: row.averageExpectedValue,
    skipSuccessRate: row.skipSuccessRate,
    roughPredictionSuccessRate: row.roughPredictionSuccessRate,
    honmeiHitRate: row.honmeiHitRate,
    anaHitRate: row.anaHitRate
  })));

  const requestedAiId = normalizeAiId(options.aiId);
  const selectedAiId = requestedAiId || leaderboard[0]?.aiId || profiles[0]?.id || '';
  const selectedMetrics = metricsByAi.find((row) => row.aiId === selectedAiId) || metricsByAi[0] || null;

  const runTimestamp = new Date().toISOString();
  const historyRows = metricsByAi.map((row) => ({
    timestamp: runTimestamp,
    runId: `${runTimestamp}-${row.aiId}`,
    aiId: row.aiId,
    aiName: row.aiName,
    dateFrom: row.dateFrom,
    dateTo: row.dateTo,
    venueIds: row.venueIds,
    totalRaces: row.totalRaces,
    hitRate: row.hitRate,
    trifectaHitRate: row.trifectaHitRate,
    exactaHitRate: row.exactaHitRate,
    roi: row.roi,
    profit: row.profit,
    averageOdds: row.averageOdds,
    averageExpectedValue: row.averageExpectedValue,
    skipSuccessRate: row.skipSuccessRate,
    roughPredictionSuccessRate: row.roughPredictionSuccessRate,
    honmeiHitRate: row.honmeiHitRate,
    anaHitRate: row.anaHitRate,
    leaderboardRank: leaderboard.find((entry) => entry.aiId === row.aiId)?.rank || 0
  }));
  appendBacktestHistory(historyRows);

  return {
    success: true,
    aiId: selectedMetrics?.aiId || selectedAiId,
    aiName: selectedMetrics?.aiName || '',
    dateFrom: normalizeImportDate(options.dateFrom),
    dateTo: normalizeImportDate(options.dateTo),
    venueIds: normalizeVenueIds(options.venueIds),
    totalRaces: Number(selectedMetrics?.totalRaces || 0),
    hitRate: Number(selectedMetrics?.hitRate || 0),
    trifectaHitRate: Number(selectedMetrics?.trifectaHitRate || 0),
    exactaHitRate: Number(selectedMetrics?.exactaHitRate || 0),
    roi: Number(selectedMetrics?.roi || 0),
    profit: Number(selectedMetrics?.profit || 0),
    averageOdds: Number(selectedMetrics?.averageOdds || 0),
    averageExpectedValue: Number(selectedMetrics?.averageExpectedValue || 0),
    skipSuccessRate: Number(selectedMetrics?.skipSuccessRate || 0),
    roughPredictionSuccessRate: Number(selectedMetrics?.roughPredictionSuccessRate || 0),
    honmeiHitRate: Number(selectedMetrics?.honmeiHitRate || 0),
    anaHitRate: Number(selectedMetrics?.anaHitRate || 0),
    leaderboard,
    results: metricsByAi,
    totalBacktestedRaces: races.length
  };
}

function getBacktestHistory(limit = 100) {
  return readBacktestHistory().slice(0, Math.max(0, Number(limit) || 100));
}

module.exports = {
  runBacktest,
  getBacktestHistory
};