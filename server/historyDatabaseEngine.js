const fs = require('fs');
const path = require('path');
const { parseRaceList, parseEntries, parseBeforeInfo, parseOdds, parseResult } = require('./parsers');

const DATABASE_PATH = path.join(__dirname, 'raceDatabase.json');
const IMPORT_LOG_PATH = path.join(__dirname, 'importLog.json');
const MAX_RACES = 100000;
const MAX_IMPORT_RANGE_DAYS = 7;
const MAX_IMPORT_RANGE_VENUES = 5;
const MAX_IMPORT_LOG_ENTRIES = 500;
const DEFAULT_VER12_DAY_MAX_LIMIT = 120;
const VER12_MIN_SAMPLE_VENUE = 60;
const VER12_MIN_SAMPLE_RACER = 30;
const VER12_MIN_SAMPLE_MOTOR = 30;

const VENUE_CODE_MAP = {
  kiryu: '01',
  toda: '02',
  edogawa: '03',
  heiwajima: '04',
  tamagawa: '05',
  hamanako: '06',
  gamagori: '07',
  tokoname: '09',
  tsu: '12',
  mikuni: '13',
  marugame: '18',
  sakaide: '21',
  kojima: '22',
  miya: '24'
};

const importControlState = {
  running: false,
  stopRequested: false,
  lastJobId: '',
  startedAt: '',
  finishedAt: '',
  options: null,
  progress: {
    totalPairs: 0,
    processedPairs: 0,
    imported: 0,
    updated: 0,
    failed: 0,
    currentDate: '',
    currentVenueId: '',
    percent: 0,
    progressLogs: [],
    failedDetails: []
  },
  lastResult: null
};

function ensureDatabaseFile() {
  if (!fs.existsSync(DATABASE_PATH)) {
    fs.writeFileSync(DATABASE_PATH, '[]\n', 'utf8');
  }
}

function readRaceDatabase() {
  ensureDatabaseFile();
  try {
    const raw = fs.readFileSync(DATABASE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function writeRaceDatabase(rows) {
  fs.writeFileSync(DATABASE_PATH, `${JSON.stringify(rows.slice(0, MAX_RACES), null, 2)}\n`, 'utf8');
}

function ensureImportLogFile() {
  if (!fs.existsSync(IMPORT_LOG_PATH)) {
    fs.writeFileSync(IMPORT_LOG_PATH, '[]\n', 'utf8');
  }
}

function normalizeText(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getImportRetryDelay(attempt) {
  if (attempt === 1) {
    return 1000;
  }
  if (attempt === 2) {
    return 3000;
  }
  return 0;
}

function createFetchFailureDetail(date, venueId, raceNo, fetchResult, fallbackReason) {
  const result = fetchResult || {};
  return {
    ...createFailedDetail(date, venueId, raceNo, fallbackReason || result.reason || 'official page unavailable'),
    url: String(result.url || ''),
    status: Number.isFinite(result.status) ? result.status : 0,
    title: String(result.title || ''),
    retryCount: Number.isFinite(result.retryCount) ? result.retryCount : 0,
    errorMessage: String(result.errorMessage || '')
  };
}

function readImportLog() {
  ensureImportLogFile();
  try {
    const raw = fs.readFileSync(IMPORT_LOG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function writeImportLog(rows) {
  fs.writeFileSync(IMPORT_LOG_PATH, `${JSON.stringify(rows.slice(0, MAX_IMPORT_LOG_ENTRIES), null, 2)}\n`, 'utf8');
}

function appendImportLog(entry) {
  const rows = readImportLog();
  rows.unshift(entry);
  writeImportLog(rows);
}

function getImportLog(limit = 50) {
  return readImportLog().slice(0, Math.max(0, Number(limit) || 50));
}

function extractHtmlTitle(html) {
  const match = String(html || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? normalizeText(match[1]) : '';
}

async function fetchWithRetry(targetUrl, options = {}) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 BoatAI/1.0',
    ...(options.headers || {})
  };

  let lastStatus = 0;
  let lastTitle = '';
  let lastErrorMessage = '';
  let lastReason = 'official page unavailable';

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(targetUrl, {
        headers,
        signal: controller.signal
      });
      const text = await response.text();
      lastStatus = response.status || 0;
      lastTitle = extractHtmlTitle(text);

      if (response.ok && text && text.length > 2000) {
        return {
          html: text,
          url: targetUrl,
          status: response.status || 0,
          title: lastTitle,
          retryCount: attempt - 1,
          errorMessage: '',
          reason: ''
        };
      }

      if (response.ok && text && options.noRacePattern && options.noRacePattern.test(text)) {
        return {
          html: text,
          url: targetUrl,
          status: response.status || 0,
          title: lastTitle,
          retryCount: attempt - 1,
          errorMessage: '',
          reason: 'no race'
        };
      }

      lastErrorMessage = response.ok
        ? 'empty response body'
        : `HTTP ${response.status} ${response.statusText}`.trim();
      lastReason = 'official page unavailable';
    } catch (error) {
      lastErrorMessage = error?.message || 'fetch failed';
      lastReason = /abort|timeout/i.test(lastErrorMessage) ? 'network error' : 'network error';
    } finally {
      clearTimeout(timeoutId);
    }

    if (attempt < 3) {
      await sleep(getImportRetryDelay(attempt));
    }
  }

  return {
    html: '',
    url: targetUrl,
    status: lastStatus,
    title: lastTitle,
    retryCount: 2,
    errorMessage: lastErrorMessage,
    reason: lastReason
  };
}

async function fetchHtmlWithDiagnosis(candidateUrls, options = {}) {
  let lastResult = {
    html: '',
    url: candidateUrls[0] || '',
    status: 0,
    title: '',
    retryCount: 0,
    errorMessage: '',
    reason: 'official page unavailable'
  };

  for (const targetUrl of candidateUrls) {
    const result = await fetchWithRetry(targetUrl, options);
    lastResult = result;
    if (result.html || result.reason === 'no race') {
      return result;
    }
  }

  return lastResult;
}

function buildRaceKey(date, venueId, raceNo) {
  return `${date}-${venueId}-${raceNo}`;
}

function normalizeDate(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 8) {
    return digits;
  }
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

function normalizeWindDirection(value) {
  const direction = String(value || '');
  if (/向かい/.test(direction)) return '向かい風';
  if (/追い|追風/.test(direction)) return '追い風';
  if (/右/.test(direction)) return '右横風';
  if (/左/.test(direction)) return '左横風';
  if (/横/.test(direction)) return '横風';
  return direction || '不明';
}

function createDefaultBeforeInfo(venueId, raceNo) {
  return {
    venueId,
    raceNo: String(raceNo),
    weather: '',
    windDirection: '',
    windSpeed: '',
    waveHeight: '',
    airTemperature: '',
    waterTemperature: '',
    entries: []
  };
}

function createDefaultOdds(venueId, raceNo) {
  return {
    venueId,
    raceNo: String(raceNo),
    trifecta: [],
    exacta: [],
    quinella: [],
    quinellaPlace: []
  };
}

function createDefaultResult(venueId, raceNo) {
  return {
    venueId,
    raceNo: String(raceNo),
    order: '',
    kimarite: '',
    finishers: [],
    payouts: []
  };
}

function hasOddsRows(odds) {
  return Number(odds?.trifecta?.length || 0)
    + Number(odds?.exacta?.length || 0)
    + Number(odds?.quinella?.length || 0)
    + Number(odds?.quinellaPlace?.length || 0) > 0;
}

function hasRaceContent(entries, beforeInfo, odds, result) {
  if (Array.isArray(entries) && entries.length > 0) return true;
  if (Array.isArray(beforeInfo?.entries) && beforeInfo.entries.length > 0) return true;
  if (hasOddsRows(odds)) return true;
  if (String(result?.order || '')) return true;
  if (Array.isArray(result?.payouts) && result.payouts.length > 0) return true;
  return false;
}

function buildDatabaseRecord({ venueId, raceNo, date, entries, beforeInfo, odds, result }) {
  const normalizedRaceNo = String(raceNo);

  return {
    date,
    venueId,
    raceNo: normalizedRaceNo,
    entries: Array.isArray(entries) ? entries : [],
    beforeInfo: beforeInfo || createDefaultBeforeInfo(venueId, normalizedRaceNo),
    odds: odds || createDefaultOdds(venueId, normalizedRaceNo),
    result: result || createDefaultResult(venueId, normalizedRaceNo),
    importedAt: new Date().toISOString()
  };
}

function createFailedDetail(date, venueId, raceNo, reason) {
  return {
    date: String(date || ''),
    venueId: String(venueId || ''),
    raceNo: String(raceNo || ''),
    reason: String(reason || 'official page unavailable')
  };
}

function normalizeImportDate(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 8) {
    return '';
  }
  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month - 1
    || parsed.getUTCDate() !== day
  ) {
    return '';
  }
  return digits;
}

function enumerateDateRange(dateFrom, dateTo) {
  const fromYear = Number(dateFrom.slice(0, 4));
  const fromMonth = Number(dateFrom.slice(4, 6));
  const fromDay = Number(dateFrom.slice(6, 8));
  const toYear = Number(dateTo.slice(0, 4));
  const toMonth = Number(dateTo.slice(4, 6));
  const toDay = Number(dateTo.slice(6, 8));

  const current = new Date(Date.UTC(fromYear, fromMonth - 1, fromDay));
  const end = new Date(Date.UTC(toYear, toMonth - 1, toDay));
  const days = [];

  while (current.getTime() <= end.getTime()) {
    const y = String(current.getUTCFullYear()).padStart(4, '0');
    const m = String(current.getUTCMonth() + 1).padStart(2, '0');
    const d = String(current.getUTCDate()).padStart(2, '0');
    days.push(`${y}${m}${d}`);
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return days;
}

function normalizeVenueIds(values) {
  const list = Array.isArray(values) ? values : [];
  const unique = [];
  const seen = new Set();

  for (const value of list) {
    const venueId = String(value || '').trim();
    if (!venueId || !VENUE_CODE_MAP[venueId] || seen.has(venueId)) {
      continue;
    }
    seen.add(venueId);
    unique.push(venueId);
  }

  return unique;
}

async function importVenueDateIntoMap({ targetDate, venueId, byKey, maxRacesPerVenue, shouldStop }) {
  const venueCode = VENUE_CODE_MAP[venueId];
  const counters = {
    imported: 0,
    updated: 0,
    failed: 0,
    failedDetails: []
  };

  if (!venueCode) {
    const failedCount = Math.min(12, Math.max(1, Number(maxRacesPerVenue) || 12));
    counters.failed = failedCount;
    counters.failedDetails = Array.from({ length: failedCount }, (_, index) => createFetchFailureDetail(targetDate, venueId, String(index + 1), null, 'official page unavailable'));
    return counters;
  }

  const raceListFetch = await fetchHtmlWithDiagnosis([
    `https://www.boatrace.jp/owpc/pc/race/raceindex?jcd=${venueCode}&hd=${targetDate}`
  ], {
    noRacePattern: /開催.*(ありません|なし)|本日.*(開催|レース).*(ありません|なし)|休催|中止/i
  });

  if (raceListFetch.reason === 'no race') {
    const failedCount = Math.min(12, Math.max(1, Number(maxRacesPerVenue) || 12));
    counters.failed = failedCount;
    counters.failedDetails = Array.from({ length: failedCount }, (_, index) => createFetchFailureDetail(targetDate, venueId, String(index + 1), raceListFetch, 'no race'));
    return counters;
  }

  if (!raceListFetch.html) {
    const failedCount = Math.min(12, Math.max(1, Number(maxRacesPerVenue) || 12));
    counters.failed = failedCount;
    counters.failedDetails = Array.from({ length: failedCount }, (_, index) => createFetchFailureDetail(targetDate, venueId, String(index + 1), raceListFetch, raceListFetch.reason || 'official page unavailable'));
    return counters;
  }

  parseRaceList(raceListFetch.html, venueId);

  for (let raceNo = 1; raceNo <= Math.min(12, maxRacesPerVenue); raceNo += 1) {
    if (shouldStop && shouldStop()) {
      return {
        ...counters,
        stopped: true
      };
    }
    const raceNoText = String(raceNo);
    if (raceNo > 1) {
      await sleep(300 + Math.floor(Math.random() * 501));
    }
    const entriesFetch = await fetchHtmlWithDiagnosis([
      `https://www.boatrace.jp/owpc/pc/race/racelist?rno=${raceNoText}&jcd=${venueCode}&hd=${targetDate}`
    ]);
    if (!entriesFetch.html) {
      counters.failed += 1;
      counters.failedDetails.push(createFetchFailureDetail(targetDate, venueId, raceNoText, entriesFetch, entriesFetch.reason || 'official page unavailable'));
      continue;
    }

    const entries = parseEntries(entriesFetch.html, venueId, raceNoText);
    if (!Array.isArray(entries) || entries.length === 0) {
      counters.failed += 1;
      counters.failedDetails.push(createFetchFailureDetail(targetDate, venueId, raceNoText, entriesFetch, 'entries parse failed'));
      continue;
    }

    const beforeFetch = await fetchHtmlWithDiagnosis([
      `https://www.boatrace.jp/owpc/pc/race/beforeinfo?rno=${raceNoText}&jcd=${venueCode}&hd=${targetDate}`
    ]);
    if (!beforeFetch.html) {
      counters.failed += 1;
      counters.failedDetails.push(createFetchFailureDetail(targetDate, venueId, raceNoText, beforeFetch, beforeFetch.reason || 'official page unavailable'));
      continue;
    }

    const beforeInfo = parseBeforeInfo(beforeFetch.html, venueId, raceNoText);
    if (!Array.isArray(beforeInfo?.entries) || beforeInfo.entries.length === 0) {
      counters.failed += 1;
      counters.failedDetails.push(createFetchFailureDetail(targetDate, venueId, raceNoText, beforeFetch, 'before parse failed'));
      continue;
    }

    const oddsFetch = await fetchHtmlWithDiagnosis([
      `https://www.boatrace.jp/owpc/pc/race/odds?rno=${raceNoText}&jcd=${venueCode}&hd=${targetDate}`,
      `https://www.boatrace.jp/owpc/pc/race/odds?jcd=${venueCode}&rno=${raceNoText}&hd=${targetDate}`,
      `https://www.boatrace.jp/owpc/pc/race/odds3?rno=${raceNoText}&jcd=${venueCode}&hd=${targetDate}`,
      `https://www.boatrace.jp/owpc/pc/race/odds2?rno=${raceNoText}&jcd=${venueCode}&hd=${targetDate}`
    ]);
    if (!oddsFetch.html) {
      counters.failed += 1;
      counters.failedDetails.push(createFetchFailureDetail(targetDate, venueId, raceNoText, oddsFetch, oddsFetch.reason || 'official page unavailable'));
      continue;
    }

    const odds = parseOdds(oddsFetch.html, venueId, raceNoText);
    if (!hasOddsRows(odds)) {
      counters.failed += 1;
      counters.failedDetails.push(createFetchFailureDetail(targetDate, venueId, raceNoText, oddsFetch, 'odds parse failed'));
      continue;
    }

    const resultFetch = await fetchHtmlWithDiagnosis([
      `https://www.boatrace.jp/owpc/pc/race/raceresult?rno=${raceNoText}&jcd=${venueCode}&hd=${targetDate}`,
      `https://www.boatrace.jp/owpc/pc/race/raceresult?jcd=${venueCode}&rno=${raceNoText}&hd=${targetDate}`
    ]);
    if (!resultFetch.html) {
      counters.failed += 1;
      counters.failedDetails.push(createFetchFailureDetail(targetDate, venueId, raceNoText, resultFetch, resultFetch.reason || 'official page unavailable'));
      continue;
    }

    const result = parseResult(resultFetch.html, venueId, raceNoText);
    const hasResultContent = Boolean(String(result?.order || '').trim()) || (Array.isArray(result?.finishers) && result.finishers.length > 0) || (Array.isArray(result?.payouts) && result.payouts.length > 0);
    if (!hasResultContent) {
      counters.failed += 1;
      counters.failedDetails.push(createFetchFailureDetail(targetDate, venueId, raceNoText, resultFetch, 'result parse failed'));
      continue;
    }

    const key = buildRaceKey(targetDate, venueId, raceNoText);
    const existed = byKey.has(key);
    const record = buildDatabaseRecord({ venueId, raceNo: raceNoText, date: targetDate, entries, beforeInfo, odds, result });
    byKey.set(key, record);

    if (existed) {
      counters.updated += 1;
    } else {
      counters.imported += 1;
    }
  }

  return {
    ...counters,
    stopped: false
  };
}

function flushDatabaseFromMap(byKey) {
  const rows = Array.from(byKey.values())
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(a.venueId).localeCompare(String(b.venueId)) || Number(a.raceNo) - Number(b.raceNo));
  writeRaceDatabase(rows);

  const latestDate = rows.reduce((latest, row) => {
    const rowDate = String(row?.date || '');
    return rowDate > latest ? rowDate : latest;
  }, '');

  return {
    rows,
    latestDate: latestDate || null
  };
}

async function importRaceRange(options = {}) {
  const dateFrom = normalizeImportDate(options?.dateFrom);
  const dateTo = normalizeImportDate(options?.dateTo);
  if (!dateFrom || !dateTo) {
    throw new Error('dateFrom/dateTo must be YYYYMMDD');
  }
  if (dateFrom > dateTo) {
    throw new Error('dateFrom must be <= dateTo');
  }

  const dates = enumerateDateRange(dateFrom, dateTo);
  const dayMaxLimit = Number(options?.dayMaxLimit) > 0
    ? Number(options.dayMaxLimit)
    : MAX_IMPORT_RANGE_DAYS;
  if (dates.length > dayMaxLimit) {
    throw new Error(`date range must be <= ${dayMaxLimit} days`);
  }

  const venueIds = normalizeVenueIds(options?.venueIds);
  if (venueIds.length === 0) {
    throw new Error('venueIds must include at least one valid venue');
  }
  if (venueIds.length > MAX_IMPORT_RANGE_VENUES) {
    throw new Error(`venueIds must be <= ${MAX_IMPORT_RANGE_VENUES}`);
  }

  const maxRacesPerVenue = Number(options.maxRacesPerVenue) > 0 ? Number(options.maxRacesPerVenue) : 12;
  const database = readRaceDatabase();
  const byKey = new Map(database.map((row) => [buildRaceKey(String(row?.date || ''), String(row?.venueId || ''), String(row?.raceNo || '')), row]));

  const progressLogs = [];
  let imported = 0;
  let updated = 0;
  let failed = 0;
  const failedDetails = [];
  const onProgress = typeof options?.onProgress === 'function' ? options.onProgress : null;
  const shouldStop = typeof options?.shouldStop === 'function' ? options.shouldStop : null;
  const totalPairs = dates.length * venueIds.length;
  let processedPairs = 0;
  let stopped = false;

  for (const targetDate of dates) {
    if (shouldStop && shouldStop()) {
      stopped = true;
      break;
    }
    for (const venueId of venueIds) {
      if (shouldStop && shouldStop()) {
        stopped = true;
        break;
      }
      progressLogs.push(`start ${targetDate} ${venueId}`);
      const venueResult = await importVenueDateIntoMap({
        targetDate,
        venueId,
        byKey,
        maxRacesPerVenue,
        shouldStop
      });

      imported += venueResult.imported;
      updated += venueResult.updated;
      failed += venueResult.failed;
      if (Array.isArray(venueResult.failedDetails) && venueResult.failedDetails.length > 0) {
        failedDetails.push(...venueResult.failedDetails);
      }

      progressLogs.push(
        `done ${targetDate} ${venueId} imported=${venueResult.imported} updated=${venueResult.updated} failed=${venueResult.failed}`
      );

      processedPairs += 1;
      if (onProgress) {
        onProgress({
          totalPairs,
          processedPairs,
          imported,
          updated,
          failed,
          currentDate: targetDate,
          currentVenueId: venueId,
          percent: totalPairs > 0 ? Math.round((processedPairs / totalPairs) * 1000) / 10 : 0,
          progressLogs,
          failedDetails
        });
      }
      if (venueResult.stopped) {
        stopped = true;
        break;
      }
    }
    if (stopped) {
      break;
    }
  }

  const { rows, latestDate } = flushDatabaseFromMap(byKey);

  appendImportLog({
    timestamp: new Date().toISOString(),
    dateFrom,
    dateTo,
    venueIds,
    dayMaxLimit,
    stopped,
    imported,
    updated,
    failed,
    failedDetails
  });

  return {
    success: true,
    imported,
    updated,
    failed,
    totalRaces: imported + updated + failed,
    totalInDatabase: rows.length,
    latestDate,
    venues: venueIds.length,
    stopped,
    processedPairs,
    totalPairs,
    progressLogs,
    failedDetails
  };
}

function resetImportControlState() {
  importControlState.running = false;
  importControlState.stopRequested = false;
  importControlState.startedAt = '';
  importControlState.finishedAt = '';
  importControlState.options = null;
  importControlState.progress = {
    totalPairs: 0,
    processedPairs: 0,
    imported: 0,
    updated: 0,
    failed: 0,
    currentDate: '',
    currentVenueId: '',
    percent: 0,
    progressLogs: [],
    failedDetails: []
  };
}

function getImportControlStatus() {
  return {
    running: importControlState.running,
    stopRequested: importControlState.stopRequested,
    lastJobId: importControlState.lastJobId,
    startedAt: importControlState.startedAt || null,
    finishedAt: importControlState.finishedAt || null,
    options: importControlState.options,
    progress: {
      ...importControlState.progress,
      progressLogs: Array.isArray(importControlState.progress?.progressLogs)
        ? importControlState.progress.progressLogs.slice(-120)
        : [],
      failedDetails: Array.isArray(importControlState.progress?.failedDetails)
        ? importControlState.progress.failedDetails.slice(0, 300)
        : []
    },
    lastResult: importControlState.lastResult
  };
}

function requestImportStop() {
  importControlState.stopRequested = true;
  return {
    success: true,
    running: importControlState.running,
    stopRequested: true,
    message: importControlState.running ? 'stop requested' : 'no running import'
  };
}

function pickResumeDateFromImportLog(venueIds, defaultDate) {
  const logs = getImportLog(200);
  if (!Array.isArray(logs) || logs.length === 0) {
    return defaultDate;
  }
  const venueSet = new Set((Array.isArray(venueIds) ? venueIds : []).map((v) => String(v || '')));
  for (const log of logs) {
    if (log?.stopped) {
      continue;
    }
    const logVenues = Array.isArray(log?.venueIds) ? log.venueIds.map((v) => String(v || '')) : [];
    if (venueSet.size > 0 && !logVenues.some((v) => venueSet.has(v))) {
      continue;
    }
    const latest = normalizeImportDate(log?.dateTo);
    if (latest) {
      return latest;
    }
  }
  return defaultDate;
}

function nextDateKey(dateKey) {
  const y = Number(String(dateKey || '').slice(0, 4));
  const m = Number(String(dateKey || '').slice(4, 6));
  const d = Number(String(dateKey || '').slice(6, 8));
  if (!y || !m || !d) {
    return '';
  }
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  const yy = String(dt.getUTCFullYear()).padStart(4, '0');
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

async function importRaceRangeVer12(options = {}) {
  if (importControlState.running) {
    throw new Error('import already running');
  }

  const dateFrom = normalizeImportDate(options?.dateFrom);
  const dateTo = normalizeImportDate(options?.dateTo);
  if (!dateFrom || !dateTo) {
    throw new Error('dateFrom/dateTo must be YYYYMMDD');
  }

  const venueIds = normalizeVenueIds(options?.venueIds);
  if (venueIds.length === 0) {
    throw new Error('venueIds must include at least one valid venue');
  }

  const resume = Boolean(options?.resume);
  const continueOnFailure = options?.continueOnFailure !== false;
  const maxRacesPerVenue = Number(options?.maxRacesPerVenue) > 0 ? Number(options.maxRacesPerVenue) : 12;
  const dayMaxLimit = Number(options?.dayMaxLimit) > 0
    ? Number(options.dayMaxLimit)
    : DEFAULT_VER12_DAY_MAX_LIMIT;
  const baseFrom = resume ? pickResumeDateFromImportLog(venueIds, dateFrom) : dateFrom;
  const resumedFrom = resume ? nextDateKey(baseFrom) || baseFrom : dateFrom;
  const boundedFrom = resumedFrom < dateFrom ? dateFrom : resumedFrom;

  const jobId = `ver12-${Date.now()}`;
  resetImportControlState();
  importControlState.running = true;
  importControlState.lastJobId = jobId;
  importControlState.startedAt = new Date().toISOString();
  importControlState.options = {
    dateFrom,
    dateTo,
    effectiveDateFrom: boundedFrom,
    venueIds,
    resume,
    continueOnFailure,
    maxRacesPerVenue,
    dayMaxLimit
  };

  try {
    const result = await importRaceRange({
      dateFrom: boundedFrom,
      dateTo,
      venueIds,
      maxRacesPerVenue,
      dayMaxLimit,
      shouldStop: () => importControlState.stopRequested,
      onProgress: (progress) => {
        importControlState.progress = {
          ...progress,
          failedDetails: continueOnFailure
            ? (Array.isArray(progress?.failedDetails) ? progress.failedDetails : [])
            : []
        };
      }
    });

    importControlState.lastResult = {
      ...result,
      jobId,
      resume,
      continueOnFailure,
      effectiveDateFrom: boundedFrom
    };

    return {
      ...result,
      jobId,
      resume,
      continueOnFailure,
      effectiveDateFrom: boundedFrom
    };
  } finally {
    importControlState.running = false;
    importControlState.finishedAt = new Date().toISOString();
    importControlState.stopRequested = false;
  }
}

async function importRaceDate(date, options = {}) {
  const targetDate = normalizeDate(date);
  const venueIds = options?.venueId
    ? [String(options.venueId)]
    : (Array.isArray(options.venueIds) && options.venueIds.length > 0
      ? options.venueIds.map((id) => String(id))
      : ['kiryu']);

  const rangeResult = await importRaceRange({
    dateFrom: targetDate,
    dateTo: targetDate,
    venueIds,
    maxRacesPerVenue: options.maxRacesPerVenue
  });

  return {
    importedCount: Number(rangeResult.imported || 0) + Number(rangeResult.updated || 0),
    totalRaces: Number(rangeResult.totalInDatabase || 0),
    latestDate: rangeResult.latestDate || null
  };
}

function getDatabaseStatus() {
  const rows = readRaceDatabase();
  const venues = new Set(rows.map((row) => row.venueId).filter(Boolean));
  const latestDate = rows.reduce((latest, row) => {
    const rowDate = String(row?.date || '');
    return rowDate > latest ? rowDate : latest;
  }, '');
  return {
    totalRaces: rows.length,
    latestDate: latestDate || null,
    venues: venues.size
  };
}

function getImportLogSummary(limit = 50) {
  return getImportLog(limit);
}

function toNumber(value, fallback = 0) {
  const normalized = String(value ?? '').replace(/[^0-9.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getWinningLane(row) {
  const order = String(row?.result?.order || '');
  const lane = order.split(/[-,]/)[0] || '';
  return /^\d+$/.test(lane) ? lane : '';
}

function getWinningEntry(row) {
  const lane = getWinningLane(row);
  if (!lane) {
    return null;
  }
  const entries = Array.isArray(row?.entries) ? row.entries : [];
  return entries.find((entry) => String(entry?.lane || '') === lane) || null;
}

function buildLaneWinRates(rows) {
  const laneWins = new Map();
  for (let lane = 1; lane <= 6; lane += 1) {
    laneWins.set(String(lane), 0);
  }

  let totalWithResult = 0;
  for (const row of rows) {
    const winningLane = getWinningLane(row);
    if (!winningLane) {
      continue;
    }
    totalWithResult += 1;
    laneWins.set(winningLane, (laneWins.get(winningLane) || 0) + 1);
  }

  const laneWinRates = {};
  for (const [lane, wins] of laneWins.entries()) {
    laneWinRates[lane] = totalWithResult > 0 ? Math.round((wins / totalWithResult) * 1000) / 10 : 0;
  }

  return {
    laneWinRates,
    totalWithResult
  };
}

function getVenueRows(venueId) {
  return readRaceDatabase().filter((row) => String(row?.venueId || '') === String(venueId || ''));
}

function getVenueStats(venueId) {
  const rows = getVenueRows(venueId);
  const { laneWinRates, totalWithResult } = buildLaneWinRates(rows);
  return {
    venueId: String(venueId || ''),
    totalRaces: rows.length,
    totalWithResult,
    laneWinRates,
    lane1WinRate: laneWinRates['1'] || 0
  };
}

function getLaneWinRate(venueId, lane) {
  const stats = getVenueStats(venueId);
  return toNumber(stats?.laneWinRates?.[String(lane)], 0);
}

function getWeatherStats(venueId, weather, windSpeed, waveHeight) {
  const rows = getVenueRows(venueId);
  const targetWeather = String(weather || '').trim();
  const targetWind = toNumber(windSpeed, NaN);
  const targetWave = toNumber(waveHeight, NaN);

  const filtered = rows.filter((row) => {
    const rowWeather = String(row?.beforeInfo?.weather || '').trim();
    if (targetWeather && rowWeather && rowWeather !== targetWeather) {
      return false;
    }

    const rowWind = toNumber(row?.beforeInfo?.windSpeed, NaN);
    if (Number.isFinite(targetWind) && Number.isFinite(rowWind) && Math.abs(rowWind - targetWind) > 1.0) {
      return false;
    }

    const rowWave = toNumber(row?.beforeInfo?.waveHeight, NaN);
    if (Number.isFinite(targetWave) && Number.isFinite(rowWave) && Math.abs(rowWave - targetWave) > 2.0) {
      return false;
    }

    return true;
  });

  const { laneWinRates, totalWithResult } = buildLaneWinRates(filtered);
  const outsideWins = toNumber(laneWinRates['5'], 0) + toNumber(laneWinRates['6'], 0);

  return {
    totalRaces: filtered.length,
    totalWithResult,
    laneWinRates,
    outsideWinRate: Math.round(outsideWins * 10) / 10
  };
}

function getMotorStats(motorNo) {
  const target = String(motorNo || '').trim();
  if (!target) {
    return { motorNo: '', appearances: 0, wins: 0, winRate: 0 };
  }

  const rows = readRaceDatabase();
  let appearances = 0;
  let wins = 0;

  for (const row of rows) {
    const entries = Array.isArray(row?.entries) ? row.entries : [];
    const matchedEntries = entries.filter((entry) => String(entry?.motorNo || '').trim() === target);
    if (matchedEntries.length === 0) {
      continue;
    }

    appearances += matchedEntries.length;
    const winner = getWinningEntry(row);
    if (winner && String(winner?.motorNo || '').trim() === target) {
      wins += 1;
    }
  }

  return {
    motorNo: target,
    appearances,
    wins,
    winRate: appearances > 0 ? Math.round((wins / appearances) * 1000) / 10 : 0
  };
}

function getRacerStats(registrationNo) {
  const target = String(registrationNo || '').trim();
  if (!target) {
    return { registrationNo: '', starts: 0, wins: 0, winRate: 0 };
  }

  const rows = readRaceDatabase();
  let starts = 0;
  let wins = 0;

  for (const row of rows) {
    const entries = Array.isArray(row?.entries) ? row.entries : [];
    const isStarted = entries.some((entry) => String(entry?.registrationNo || '').trim() === target);
    if (!isStarted) {
      continue;
    }

    starts += 1;
    const winner = getWinningEntry(row);
    if (winner && String(winner?.registrationNo || '').trim() === target) {
      wins += 1;
    }
  }

  return {
    registrationNo: target,
    starts,
    wins,
    winRate: starts > 0 ? Math.round((wins / starts) * 1000) / 10 : 0
  };
}

function buildWeatherLaneWinRates(rows) {
  const directionTotals = new Map();
  const weatherWins = new Map();

  for (const row of rows) {
    const winningLane = getWinningLane(row);
    if (!winningLane) {
      continue;
    }

    const direction = normalizeWindDirection(row?.beforeInfo?.windDirection || row?.windDirection || '不明');
    directionTotals.set(direction, (directionTotals.get(direction) || 0) + 1);
    const weatherKey = `${direction}:${winningLane}`;
    weatherWins.set(weatherKey, (weatherWins.get(weatherKey) || 0) + 1);
  }

  const weatherLaneWinRates = {};
  for (const [direction, total] of directionTotals.entries()) {
    weatherLaneWinRates[direction] = {};
    for (let lane = 1; lane <= 6; lane += 1) {
      const key = `${direction}:${lane}`;
      const wins = weatherWins.get(key) || 0;
      weatherLaneWinRates[direction][String(lane)] = total > 0
        ? Math.round((wins / total) * 1000) / 10
        : 0;
    }
  }

  return weatherLaneWinRates;
}

function getVenueStatistics(venueId) {
  const rows = getVenueRows(venueId);
  const venueStats = getVenueStats(venueId);
  return {
    totalRaces: venueStats.totalRaces,
    laneWinRates: venueStats.laneWinRates,
    weatherLaneWinRates: buildWeatherLaneWinRates(rows)
  };
}

function classifyWindSpeedBand(value) {
  const speed = toNumber(value, 0);
  if (speed >= 8) return '8m+';
  if (speed >= 5) return '5-7m';
  if (speed >= 3) return '3-4m';
  if (speed >= 1) return '1-2m';
  return '0m';
}

function classifyWaveBand(value) {
  const wave = toNumber(value, 0);
  if (wave >= 15) return '15cm+';
  if (wave >= 10) return '10-14cm';
  if (wave >= 5) return '5-9cm';
  return '0-4cm';
}

function classifyStBand(value) {
  const st = toNumber(value, NaN);
  if (!Number.isFinite(st)) return 'unknown';
  if (st <= 0.12) return '0.12以下';
  if (st <= 0.15) return '0.13-0.15';
  if (st <= 0.18) return '0.16-0.18';
  if (st <= 0.22) return '0.19-0.22';
  return '0.23以上';
}

function classifyGrade(row) {
  const text = String(row?.raceName || row?.raceTitle || row?.raceType || '').toUpperCase();
  if (/SG/.test(text)) return 'SG';
  if (/G1/.test(text)) return 'G1';
  if (/G2/.test(text)) return 'G2';
  if (/G3/.test(text)) return 'G3';
  return '一般';
}

function classifyDayNight(row) {
  const raceNo = toNumber(row?.raceNo, 0);
  if (raceNo >= 7) return 'night';
  return 'day';
}

function getGlobalDatabaseSummary() {
  const rows = readRaceDatabase();
  const venues = new Set();
  const uniqueRaceDays = new Set();
  let latestImportAt = '';
  let withResult = 0;

  for (const row of rows) {
    const venueId = String(row?.venueId || '').trim();
    const date = String(row?.date || '').trim();
    if (venueId) {
      venues.add(venueId);
    }
    if (venueId && date) {
      uniqueRaceDays.add(`${venueId}:${date}`);
    }
    const importedAt = String(row?.importedAt || '');
    if (importedAt > latestImportAt) {
      latestImportAt = importedAt;
    }
    if (getWinningLane(row)) {
      withResult += 1;
    }
  }

  const statsConfidence = rows.length > 0
    ? Math.round(Math.min(1, withResult / Math.max(1, rows.length)) * 1000) / 10
    : 0;

  return {
    totalRaces: rows.length,
    venues: venues.size,
    uniqueRaceDays: uniqueRaceDays.size,
    latestDate: rows.reduce((latest, row) => {
      const rowDate = String(row?.date || '');
      return rowDate > latest ? rowDate : latest;
    }, '') || null,
    latestImportAt: latestImportAt || null,
    learningRaceCount: withResult,
    statsConfidence
  };
}

function getVer12VenueStatistics(venueId) {
  const rows = getVenueRows(venueId);
  const venueStats = getVenueStats(venueId);
  const windBands = {};
  const waveBands = {};
  const stBands = {};
  const gradeCounts = {};
  const dayNightCounts = { day: 0, night: 0 };

  for (const row of rows) {
    const winningLane = getWinningLane(row);
    if (!winningLane) {
      continue;
    }

    const windBand = classifyWindSpeedBand(row?.beforeInfo?.windSpeed);
    const waveBand = classifyWaveBand(row?.beforeInfo?.waveHeight);
    const grade = classifyGrade(row);
    const dayNight = classifyDayNight(row);

    windBands[windBand] = windBands[windBand] || { total: 0, laneWinRates: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0 } };
    waveBands[waveBand] = waveBands[waveBand] || { total: 0, laneWinRates: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0 } };
    windBands[windBand].total += 1;
    waveBands[waveBand].total += 1;
    windBands[windBand].laneWinRates[winningLane] += 1;
    waveBands[waveBand].laneWinRates[winningLane] += 1;

    gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
    dayNightCounts[dayNight] = (dayNightCounts[dayNight] || 0) + 1;

    const beforeEntries = Array.isArray(row?.beforeInfo?.entries) ? row.beforeInfo.entries : [];
    for (const entry of beforeEntries) {
      const lane = String(entry?.lane || '');
      if (!/^[1-6]$/.test(lane)) {
        continue;
      }
      const stBand = classifyStBand(entry?.startTiming);
      const key = `${lane}:${stBand}`;
      stBands[key] = stBands[key] || { lane, stBand, starts: 0, wins: 0 };
      stBands[key].starts += 1;
      if (lane === winningLane) {
        stBands[key].wins += 1;
      }
    }
  }

  const normalizeLaneRates = (bandMap) => Object.fromEntries(Object.entries(bandMap).map(([band, info]) => {
    const total = Number(info?.total || 0);
    const laneWinRates = {};
    for (let lane = 1; lane <= 6; lane += 1) {
      const laneKey = String(lane);
      laneWinRates[laneKey] = total > 0
        ? Math.round(((Number(info?.laneWinRates?.[laneKey] || 0)) / total) * 1000) / 10
        : 0;
    }
    return [band, { total, laneWinRates }];
  }));

  const stBandStats = Object.values(stBands)
    .map((row) => ({
      ...row,
      winRate: row.starts > 0 ? Math.round((row.wins / row.starts) * 1000) / 10 : 0
    }))
    .sort((a, b) => b.starts - a.starts || a.lane.localeCompare(b.lane));

  return {
    venueId: String(venueId || ''),
    totalRaces: venueStats.totalRaces,
    laneWinRates: venueStats.laneWinRates,
    weatherLaneWinRates: buildWeatherLaneWinRates(rows),
    windSpeedBands: normalizeLaneRates(windBands),
    waveBands: normalizeLaneRates(waveBands),
    stBands: stBandStats,
    dayNightCounts,
    gradeCounts,
    samplePolicy: {
      minVenueSample: VER12_MIN_SAMPLE_VENUE
    }
  };
}

function getVer12RacerStatistics(registrationNo) {
  const base = getRacerStats(registrationNo);
  const starts = Number(base?.starts || 0);
  const effectiveWinRate = starts >= VER12_MIN_SAMPLE_RACER ? Number(base?.winRate || 0) : 0;
  return {
    ...base,
    effectiveWinRate,
    sampleSufficient: starts >= VER12_MIN_SAMPLE_RACER,
    minSample: VER12_MIN_SAMPLE_RACER
  };
}

function getVer12MotorStatistics(motorNo) {
  const base = getMotorStats(motorNo);
  const appearances = Number(base?.appearances || 0);
  const effectiveWinRate = appearances >= VER12_MIN_SAMPLE_MOTOR ? Number(base?.winRate || 0) : 0;
  return {
    ...base,
    effectiveWinRate,
    sampleSufficient: appearances >= VER12_MIN_SAMPLE_MOTOR,
    minSample: VER12_MIN_SAMPLE_MOTOR
  };
}

module.exports = {
  readRaceDatabase,
  importRaceDate,
  importRaceRange,
  getImportLogSummary,
  getImportControlStatus,
  requestImportStop,
  importRaceRangeVer12,
  getDatabaseStatus,
  getGlobalDatabaseSummary,
  getVenueStats,
  getLaneWinRate,
  getWeatherStats,
  getMotorStats,
  getRacerStats,
  getVenueStatistics,
  getVer12VenueStatistics,
  getVer12RacerStatistics,
  getVer12MotorStatistics,
  normalizeWindDirection
};