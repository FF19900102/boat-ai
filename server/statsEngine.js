const { readHistory } = require('./learningEngine');
const { toNumber } = require('./weatherEngine');
const { buildLeagueLeaderboard } = require('./leagueEngine');

function sameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function sameDay(a, b) {
  return a.toDateString() === b.toDateString();
}

function aggregateROI(rows) {
  const payout = rows.reduce((sum, row) => sum + Math.max(0, toNumber(row?.payout, 0)), 0);
  const stake = rows.reduce((sum, row) => sum + toNumber(row?.evaluation?.stake, 0), 0);
  return stake > 0 ? Math.round((payout / stake) * 1000) / 10 : 0;
}

function aggregateExpectedValue(rows) {
  const values = rows.map((row) => toNumber(row?.prediction?.buyDetails?.[0]?.expectedValue, 0)).filter((value) => value > 0);
  if (values.length === 0) {
    return 0;
  }
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function summarizeRows(rows) {
  const totalRaces = rows.length;
  const hitRows = rows.filter((row) => Boolean(row?.hit));
  const profit = rows.reduce((sum, row) => sum + toNumber(row?.profit, 0), 0);
  return {
    totalRaces,
    roi: aggregateROI(rows),
    profit: Math.round(profit),
    expectedValue: aggregateExpectedValue(rows),
    hitRate: totalRaces > 0 ? Math.round((hitRows.length / totalRaces) * 1000) / 10 : 0
  };
}

function buildPeriodStats(history, now) {
  const todayRows = history.filter((row) => sameDay(new Date(row?.timestamp || 0), now));
  const monthRows = history.filter((row) => sameMonth(new Date(row?.timestamp || 0), now));
  return {
    today: summarizeRows(todayRows),
    month: summarizeRows(monthRows),
    all: summarizeRows(history)
  };
}

function buildStats() {
  const history = readHistory();
  const now = new Date();
  const periodStats = buildPeriodStats(history, now);
  const todayRows = history.filter((row) => sameDay(new Date(row?.timestamp || 0), now));
  const monthRows = history.filter((row) => sameMonth(new Date(row?.timestamp || 0), now));
  const hitRows = history.filter((row) => Boolean(row?.hit));
  const honmeiRows = history.filter((row) => String(row?.prediction?.score?.[0]?.mark || '') === '◎');
  const anaRows = history.filter((row) => Array.isArray(row?.buy) && row.buy.some((combo) => String(combo).startsWith('5-') || String(combo).startsWith('6-')));
  const roughSuccessRows = history.filter((row) => {
    const level = String(row?.roughRace?.roughLevel || '');
    const hit = Boolean(row?.hit);
    if (level === '本命') return hit;
    if (level === '中荒れ' || level === '荒れ' || level === '大荒れ') return !hit || toNumber(row?.profit, 0) > 0;
    return false;
  });

  return {
    todayROI: aggregateROI(todayRows),
    monthROI: aggregateROI(monthRows),
    todayExpectedValue: aggregateExpectedValue(todayRows),
    monthExpectedValue: aggregateExpectedValue(monthRows),
    allExpectedValue: aggregateExpectedValue(history),
    hitRate: history.length ? Math.round((hitRows.length / history.length) * 1000) / 10 : 0,
    profit: history.reduce((sum, row) => sum + toNumber(row?.profit, 0), 0),
    totalRaces: history.length,
    honmeiHitRate: honmeiRows.length ? Math.round((honmeiRows.filter((row) => row.hit).length / honmeiRows.length) * 1000) / 10 : 0,
    anaHitRate: anaRows.length ? Math.round((anaRows.filter((row) => row.hit).length / anaRows.length) * 1000) / 10 : 0,
    roughSuccessRate: history.length ? Math.round((roughSuccessRows.length / history.length) * 1000) / 10 : 0,
    periods: periodStats
  };
}

function getRecentHistory(limit = 100) {
  return readHistory().slice(0, limit);
}

function buildLeagueStats() {
  return {
    leaderboard: buildLeagueLeaderboard(5)
  };
}

module.exports = {
  buildStats,
  getRecentHistory,
  buildLeagueStats,
  buildPeriodStats
};