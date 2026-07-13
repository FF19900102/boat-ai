const express = require('express');
const path = require('path');
const { parseTodayVenues, parseRaceList, parseRaceDetail, parseEntries, parseBeforeInfo, parseOdds, parseResult } = require('./parsers');
const { predictRace } = require('./aiEngine');
const { buildStats, getRecentHistory, buildLeagueStats, buildTodayDashboard, getLatestRaceHistory } = require('./statsEngine');
const { getWeightsSnapshot, resetAiWeights } = require('./weightLearningEngine');
const { recommendTodayRaces, recommendTomorrowRaces, recommendRacesByDateApi } = require('./recommendEngine');
const { calculateMoneyManagementPlan } = require('./moneyManagementEngine');
const { trainModel, getModelStatus } = require('./mlEngine');
const {
  readRaceDatabase,
  getDatabaseStatus,
  importRaceDate,
  importRaceRange,
  getImportLogSummary,
  getImportControlStatus,
  requestImportStop,
  importRaceRangeVer12,
  getGlobalDatabaseSummary,
  getVer12VenueStatistics,
  getVer12RacerStatistics,
  getVer12MotorStatistics
} = require('./historyDatabaseEngine');
const { runOptimizer, getOptimizerHistory } = require('./optimizerEngine');
const { runBacktest, getBacktestHistory } = require('./backtestEngine');
const { getBestAiRecommendation, getBestAiSummary } = require('./bestAiEngine');
const { buildVer9AiRanking } = require('./aiRankingEngine');
const { buildAiConference } = require('./aiConferenceEngine');
const { buildHeadCoach } = require('./headCoachEngine');
const { settlePredictionHistory } = require('./learningEngine');
const { initDatabase: initDataHubDatabase, getDatabaseStatus: getDataHubDatabaseStatus } = require('../database/db');
const registerImportRaceDataApi = require('../api/importRaceData');
const registerGetRaceApi = require('../api/getRace');
const registerGetHistoryApi = require('../api/getHistory');

const app = express();
const PORT = process.env.PORT || 3001;
const publicDir = path.join(__dirname, '..');
const ALL_VENUE_IDS = ['kiryu', 'toda', 'edogawa', 'heiwajima', 'tamagawa', 'hamanako', 'gamagori', 'tokoname', 'tsu', 'mikuni', 'biwako', 'suminoe', 'amagasaki', 'naruto', 'marugame', 'kojima', 'miyajima', 'tokuyama', 'shimonoseki', 'wakamatsu', 'ashiya', 'fukuoka', 'karatsu', 'omura'];
const VENUE_CODE_MAP = {
  kiryu: '01', toda: '02', edogawa: '03', heiwajima: '04', tamagawa: '05', hamanako: '06', gamagori: '07',
  tokoname: '08', tsu: '09', mikuni: '10', biwako: '11', suminoe: '12', amagasaki: '13', naruto: '14',
  marugame: '15', kojima: '16', miyajima: '17', tokuyama: '18', shimonoseki: '19', wakamatsu: '20',
  ashiya: '21', fukuoka: '22', karatsu: '23', omura: '24'
};
let dailyAutomationLock = false;
let dailyAutomationState = { date: '', status: 'idle', lastRunAt: '', detail: '' };
let ver12ImportPromise = null;

app.use(express.json());
app.use((req, res, next) => {
  const origin = String(req.headers?.origin || '');
  const allowList = new Set(['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3001']);
  if (allowList.has(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', 'http://localhost:5174');
  }
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  return next();
});
app.use(express.static(publicDir, { index: false }));

initDataHubDatabase().catch((error) => {
  console.error('Data Hub SQLite initialization failed:', error?.message || error);
});

registerImportRaceDataApi(app);
registerGetRaceApi(app);
registerGetHistoryApi(app);

app.get('/', (req, res) => {
  return res.json({
    success: true,
    service: 'Boat AI API',
    status: 'running'
  });
});

function getTodayKey() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

function getHdParam(req) {
  const hd = String(req?.query?.hd || '').trim();
  return /^\d{8}$/.test(hd) ? hd : getTodayKey();
}

function getVenueCode(venueId) {
  return VENUE_CODE_MAP[String(venueId || '').trim()] || '';
}

async function fetchOfficialHtml(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'accept-language': 'ja,en-US;q=0.9,en;q=0.8',
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  });
  const text = await response.text();
  if (!response.ok || !text) return '';
  return text;
}

function extractConfirmedAtFromHtml(html) {
  const text = String(html || '').replace(/<[^>]*>/g, ' ');
  const match = text.match(/(確定|確定時刻)[^0-9]{0,8}([0-2]?\d:[0-5]\d)/);
  return match ? match[2] : '';
}

function enrichResultPayload(base, html) {
  const payload = base || {};
  const payouts = Array.isArray(payload?.payouts) ? payload.payouts : [];
  const pick = (label) => {
    const row = payouts.find((item) => String(item?.type || '') === label);
    return Number(row?.payout || 0) || 0;
  };

  return {
    ...payload,
    isFinal: Boolean(payload?.order),
    trifectaPayout: pick('3連単'),
    exactaPayout: pick('2連単'),
    quinellaPlacePayout: pick('拡連複'),
    confirmedAt: String(payload?.confirmedAt || extractConfirmedAtFromHtml(html) || '')
  };
}

async function fetchTodayVenuesWithConditions(req) {
  const targetUrl = 'https://www.boatrace.jp/owpc/pc/race/index';
  const response = await fetch(targetUrl);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const baseVenues = parseTodayVenues(text);
  const hd = getHdParam(req);

  const enriched = await Promise.all((Array.isArray(baseVenues) ? baseVenues : []).map(async (venue) => {
    const venueId = String(venue?.venueId || '').trim();
    const venueCode = getVenueCode(venueId);
    const currentRace = String(venue?.currentRace || '').trim();
    if (!venueCode || !currentRace) {
      return {
        ...venue,
        closeTime: String(venue?.deadline || ''),
        weather: String(venue?.weather || ''),
        windSpeed: String(venue?.windSpeed || '')
      };
    }

    try {
      const [beforeRes, racesRes] = await Promise.all([
        fetch(`https://www.boatrace.jp/owpc/pc/race/beforeinfo?rno=${currentRace}&jcd=${venueCode}&hd=${hd}`),
        fetch(`https://www.boatrace.jp/owpc/pc/race/raceindex?jcd=${venueCode}&hd=${hd}`)
      ]);

      const [beforeHtml, racesHtml] = await Promise.all([
        beforeRes.ok ? beforeRes.text() : '',
        racesRes.ok ? racesRes.text() : ''
      ]);

      const before = parseBeforeInfo(beforeHtml, venueId, currentRace);
      const raceRows = parseRaceList(racesHtml, venueId);
      const raceRow = (Array.isArray(raceRows) ? raceRows : []).find((row) => String(row?.raceNo) === currentRace) || {};

      return {
        ...venue,
        closeTime: String(raceRow?.deadline || venue?.deadline || ''),
        weather: String(before?.weather || venue?.weather || ''),
        windSpeed: String(before?.windSpeed || venue?.windSpeed || '')
      };
    } catch (error) {
      return {
        ...venue,
        closeTime: String(venue?.deadline || ''),
        weather: String(venue?.weather || ''),
        windSpeed: String(venue?.windSpeed || '')
      };
    }
  }));

  return enriched;
}

async function runDailyAutomation(force = false) {
  if (dailyAutomationLock) {
    return dailyAutomationState;
  }

  const today = getTodayKey();
  if (!force && dailyAutomationState.date === today && dailyAutomationState.status === 'done') {
    return dailyAutomationState;
  }

  dailyAutomationLock = true;
  dailyAutomationState = {
    date: today,
    status: 'running',
    lastRunAt: new Date().toISOString(),
    detail: 'starting'
  };

  try {
    const importResult = await importRaceDate(today, {
      venueIds: ALL_VENUE_IDS,
      maxRacesPerVenue: 12
    });

    const races = readRaceDatabase().filter((row) => String(row?.date || '') === today);
    for (const race of races) {
      await predictRace(String(race?.venueId || ''), String(race?.raceNo || ''), {
        persistLearning: true,
        raceData: race
      });
    }

    const model = trainModel();
    const backtest = await runBacktest({ dateFrom: today, dateTo: today, venueIds: ALL_VENUE_IDS });
    const optimizer = runOptimizer();

    dailyAutomationState = {
      date: today,
      status: 'done',
      lastRunAt: new Date().toISOString(),
      detail: `imported=${Number(importResult?.importedCount || 0)} modelSamples=${Number(model?.sampleCount || 0)} backtestRaces=${Number(backtest?.totalRaces || 0)} optimizer=${Boolean(optimizer?.success)}`
    };
  } catch (error) {
    dailyAutomationState = {
      date: today,
      status: 'error',
      lastRunAt: new Date().toISOString(),
      detail: error.message || 'automation failed'
    };
  } finally {
    dailyAutomationLock = false;
  }

  return dailyAutomationState;
}

setTimeout(() => {
  runDailyAutomation(false).catch(() => {});
}, 2500);

setInterval(() => {
  runDailyAutomation(false).catch(() => {});
}, 30 * 60 * 1000);

app.get('/api/today-venues', async (req, res) => {
  try {
    return res.json(await fetchTodayVenuesWithConditions(req));
  } catch (error) {
    return res.json([]);
  }
});

app.get('/api/races/:venueId', async (req, res) => {
  const { venueId } = req.params;
  const venueCode = getVenueCode(venueId);
  const targetUrl = venueCode
    ? `https://www.boatrace.jp/owpc/pc/race/raceindex?jcd=${venueCode}&hd=${getHdParam(req)}`
    : 'https://www.boatrace.jp/owpc/pc/race/index';

  try {
    const response = await fetch(targetUrl);
    const text = await response.text();
    if (!response.ok) {
      return res.json([]);
    }
    return res.json(parseRaceList(text, venueId));
  } catch (error) {
    return res.json([]);
  }
});

app.get('/api/race/:venueId/:raceNo', (req, res) => {
  const html = '';
  res.json(parseRaceDetail(html));
});

app.get('/api/entries/:venueId/:raceNo', async (req, res) => {
  const { venueId, raceNo } = req.params;
  const venueCode = getVenueCode(venueId);
  const targetUrl = venueCode && raceNo
    ? `https://www.boatrace.jp/owpc/pc/race/racelist?rno=${raceNo}&jcd=${venueCode}&hd=${getHdParam(req)}`
    : 'https://www.boatrace.jp/owpc/pc/race/index';

  try {
    const response = await fetch(targetUrl);
    const text = await response.text();
    if (!response.ok) {
      return res.json([]);
    }
    return res.json(parseEntries(text, venueId, raceNo));
  } catch (error) {
    return res.json([]);
  }
});

app.get('/api/before/:venueId/:raceNo', async (req, res) => {
  const { venueId, raceNo } = req.params;
  const venueCode = getVenueCode(venueId);
  const targetUrl = venueCode && raceNo
    ? `https://www.boatrace.jp/owpc/pc/race/beforeinfo?rno=${raceNo}&jcd=${venueCode}&hd=${getHdParam(req)}`
    : 'https://www.boatrace.jp/owpc/pc/race/index';

  try {
    const response = await fetch(targetUrl);
    const text = await response.text();
    if (!response.ok) {
      return res.json({});
    }
    return res.json(parseBeforeInfo(text, venueId, raceNo));
  } catch (error) {
    return res.json({});
  }
});

app.get('/api/odds/:venueId/:raceNo', async (req, res) => {
  const { venueId, raceNo } = req.params;
  const venueCode = getVenueCode(venueId);
  const hd = getHdParam(req);
  const candidateUrls = [
    `https://www.boatrace.jp/owpc/pc/race/odds3t?rno=${raceNo}&jcd=${venueCode}&hd=${hd}`,
    `https://www.boatrace.jp/owpc/pc/race/odds2tf?rno=${raceNo}&jcd=${venueCode}&hd=${hd}`,
    `https://www.boatrace.jp/owpc/pc/race/odds5?rno=${raceNo}&jcd=${venueCode}&hd=${hd}`,
    `https://www.boatrace.jp/owpc/pc/race/oddsk?rno=${raceNo}&jcd=${venueCode}&hd=${hd}`
  ];

  let html = '';
  for (const targetUrl of candidateUrls) {
    try {
      const response = await fetch(targetUrl);
      const text = await response.text();
      if (response.ok && text && !/予期せぬエラー|ログイン/.test(text)) {
        html += `\n${text}`;
      }
    } catch (error) {
      // ignore
    }
  }

  return res.json(parseOdds(html, venueId, raceNo));
});

app.get('/api/result/:venueId/:raceNo', async (req, res) => {
  const { venueId, raceNo } = req.params;
  const venueCode = getVenueCode(venueId);
  const targetUrl = venueCode && raceNo
    ? `https://www.boatrace.jp/owpc/pc/race/raceresult?rno=${raceNo}&jcd=${venueCode}&hd=${getHdParam(req)}`
    : 'https://www.boatrace.jp/owpc/pc/race/index';

  try {
    const response = await fetch(targetUrl);
    const text = await response.text();
    if (!response.ok) {
      return res.json(parseResult('', venueId, raceNo));
    }
    return res.json(parseResult(text, venueId, raceNo));
  } catch (error) {
    return res.json(parseResult('', venueId, raceNo));
  }
});

app.get('/api/official/today-venues', async (req, res) => {
  try {
    return res.json(await fetchTodayVenuesWithConditions(req));
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'fetch failed'
    });
  }
});

app.get('/api/official/venues/today', async (req, res) => {
  try {
    return res.json(await fetchTodayVenuesWithConditions(req));
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'fetch failed'
    });
  }
});

app.get('/api/official/races/:venueId', async (req, res) => {
  const { venueId } = req.params;
  const venueCode = getVenueCode(venueId);
  const targetUrl = venueCode
    ? `https://www.boatrace.jp/owpc/pc/race/raceindex?jcd=${venueCode}&hd=${getHdParam(req)}`
    : `https://www.boatrace.jp/owpc/pc/race/index`;

  try {
    const response = await fetch(targetUrl);
    const text = await response.text();
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `HTTP ${response.status} ${response.statusText}`
      });
    }

    return res.json(parseRaceList(text, venueId));
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'fetch failed'
    });
  }
});

app.get('/api/official/entries/:venueId/:raceNo', async (req, res) => {
  const { venueId, raceNo } = req.params;
  const venueCode = getVenueCode(venueId);
  const targetUrl = venueCode && raceNo
    ? `https://www.boatrace.jp/owpc/pc/race/racelist?rno=${raceNo}&jcd=${venueCode}&hd=${getHdParam(req)}`
    : `https://www.boatrace.jp/owpc/pc/race/index`;

  try {
    const response = await fetch(targetUrl);
    const text = await response.text();
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `HTTP ${response.status} ${response.statusText}`
      });
    }

    return res.json(parseEntries(text, venueId, raceNo));
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'fetch failed'
    });
  }
});

app.get('/api/official/odds/:venueId/:raceNo', async (req, res) => {
  const { venueId, raceNo } = req.params;
  const venueCode = getVenueCode(venueId);
  const hd = getHdParam(req);
  const candidateUrls = [
    `https://www.boatrace.jp/owpc/pc/race/odds3t?rno=${raceNo}&jcd=${venueCode}&hd=${hd}`,
    `https://www.boatrace.jp/owpc/pc/race/odds2tf?rno=${raceNo}&jcd=${venueCode}&hd=${hd}`,
    `https://www.boatrace.jp/owpc/pc/race/oddsk?rno=${raceNo}&jcd=${venueCode}&hd=${hd}`
  ];

  let html = '';
  for (const targetUrl of candidateUrls) {
    try {
      const response = await fetch(targetUrl);
      const text = await response.text();
      if (response.ok && text) {
        html += `\n${text}`;
      }
    } catch (error) {
      // ignore and try next candidate
    }
  }

  if (!html) {
    return res.status(200).json({
      success: false,
      error: 'official odds page unavailable'
    });
  }
  const parsed = parseOdds(html, venueId, raceNo);
  const trifectaCount = Array.isArray(parsed?.trifecta) ? parsed.trifecta.length : 0;
  const exactaCount = Array.isArray(parsed?.exacta) ? parsed.exacta.length : 0;
  const qplaceCount = Array.isArray(parsed?.quinellaPlace) ? parsed.quinellaPlace.length : 0;
  if (trifectaCount === 0 && exactaCount === 0 && qplaceCount === 0) {
    return res.json({
      success: false,
      error: 'odds parse failed',
      ...parsed
    });
  }

  return res.json(parsed);
});

app.get('/api/official/result/:venueId/:raceNo', async (req, res) => {
  const { venueId, raceNo } = req.params;
  const venueCode = getVenueCode(venueId);
  const hd = getHdParam(req);
  const candidateUrls = [
    `https://www.boatrace.jp/owpc/pc/race/raceresult?rno=${raceNo}&jcd=${venueCode}&hd=${hd}`,
    `https://www.boatrace.jp/owpc/pc/race/raceresult?jcd=${venueCode}&rno=${raceNo}&hd=${hd}`
  ];

  let html = '';
  for (const targetUrl of candidateUrls) {
    try {
      const text = await fetchOfficialHtml(targetUrl);
      if (text) {
        html = text;
        break;
      }
    } catch (error) {
      // ignore and try next candidate
    }
  }

  if (!html) {
    return res.status(200).json({
      success: false,
      error: 'official result page unavailable'
    });
  }

  return res.json(enrichResultPayload(parseResult(html, venueId, raceNo), html));
});

app.get('/api/predict/:venueId/:raceNo', async (req, res) => {
  const { venueId, raceNo } = req.params;

  try {
    const prediction = await predictRace(venueId, raceNo);
    prediction.bestAiRecommendation = getBestAiRecommendation();
    return res.json({
      success: true,
      prediction
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'prediction failed'
    });
  }
});

app.get('/api/official/before/:venueId/:raceNo', async (req, res) => {
  const { venueId, raceNo } = req.params;
  const venueCode = getVenueCode(venueId);
  const targetUrl = venueCode && raceNo
    ? `https://www.boatrace.jp/owpc/pc/race/beforeinfo?rno=${raceNo}&jcd=${venueCode}&hd=${getHdParam(req)}`
    : `https://www.boatrace.jp/owpc/pc/race/index`;

  try {
    const response = await fetch(targetUrl);
    const text = await response.text();
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `HTTP ${response.status} ${response.statusText}`
      });
    }

    return res.json(parseBeforeInfo(text, venueId, raceNo));
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'fetch failed'
    });
  }
});

app.get('/api/test-official-html', async (req, res) => {
  const targetUrl = 'https://www.boatrace.jp/owpc/pc/race/index';
  try {
    const response = await fetch(targetUrl);
    const text = await response.text();
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `HTTP ${response.status} ${response.statusText}`
      });
    }
    const titleMatch = text.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    return res.json({
      success: true,
      status: response.status,
      contentLength: text.length,
      title,
      sample: text.slice(0, 500)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'fetch failed'
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'boat-ai-server' });
});

app.get('/api/stats', (req, res) => {
  try {
    return res.json(buildStats());
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'stats failed'
    });
  }
});

app.get('/api/history', (req, res) => {
  try {
    return res.json(getRecentHistory(100));
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'history failed'
    });
  }
});

app.get('/api/ver8/dashboard', (req, res) => {
  try {
    return res.json({
      success: true,
      dashboard: buildTodayDashboard(new Date())
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'dashboard failed'
    });
  }
});

app.get('/api/ver8/race/:venueId/:raceNo', (req, res) => {
  try {
    const row = getLatestRaceHistory(String(req.params?.venueId || ''), String(req.params?.raceNo || ''));
    return res.json({
      success: true,
      record: row || null
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'race history failed'
    });
  }
});

app.post('/api/ver8/result/sync', async (req, res) => {
  const venueId = String(req.body?.venueId || '').trim();
  const raceNo = String(req.body?.raceNo || '').trim();
  if (!venueId || !raceNo) {
    return res.status(400).json({
      success: false,
      error: 'venueId and raceNo are required'
    });
  }

  try {
    const venueCode = getVenueCode(venueId);
    const hd = /^\d{8}$/.test(String(req.body?.date || '').trim()) ? String(req.body.date).trim() : getTodayKey();
    const urls = [
      `https://www.boatrace.jp/owpc/pc/race/raceresult?rno=${raceNo}&jcd=${venueCode}&hd=${hd}`,
      `https://www.boatrace.jp/owpc/pc/race/raceresult?jcd=${venueCode}&rno=${raceNo}&hd=${hd}`
    ];

    let html = '';
    for (const url of urls) {
      try {
        const text = await fetchOfficialHtml(url);
        if (text) {
          html = text;
          break;
        }
      } catch (error) {
        // try next
      }
    }

    if (!html) {
      return res.json({
        success: false,
        settled: false,
        error: 'official result page unavailable'
      });
    }

    const result = enrichResultPayload(parseResult(html, venueId, raceNo), html);
    if (!result?.isFinal) {
      return res.json({
        success: true,
        settled: false,
        result
      });
    }

    await predictRace(venueId, raceNo, { persistLearning: true });
    const settled = settlePredictionHistory({ venueId, raceNo, result, odds: null });
    const optimizer = runOptimizer();
    const settlement = settled?.settlement || {};
    const summary = {
      hit: settlement?.hit === true,
      purchaseAmount: Number(settlement?.stake || 0),
      payoutAmount: Number(settlement?.payout || 0),
      profit: Number(settlement?.profit || 0),
      roi: Number(settlement?.roi || 0)
    };

    return res.json({
      success: true,
      settled: true,
      result,
      record: settled,
      ...summary,
      optimizer: {
        success: Boolean(optimizer?.success),
        improvedAI: Number(optimizer?.improvedAI || 0)
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      settled: false,
      error: error.message || 'result sync failed'
    });
  }
});

app.get('/api/league', (req, res) => {
  try {
    return res.json(buildLeagueStats());
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'league failed'
    });
  }
});

app.post('/api/backtest/run', async (req, res) => {
  try {
    const result = await runBacktest({
      dateFrom: req.body?.dateFrom,
      dateTo: req.body?.dateTo,
      venueIds: req.body?.venueIds,
      aiId: req.body?.aiId
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'backtest failed'
    });
  }
});

app.get('/api/backtest/history', (req, res) => {
  try {
    return res.json({
      success: true,
      history: getBacktestHistory(100)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'backtest history failed'
    });
  }
});

app.get('/api/best-ai', (req, res) => {
  try {
    return res.json(getBestAiSummary(5));
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'best-ai failed'
    });
  }
});

app.get('/api/ver9/ai-ranking', (req, res) => {
  try {
    const limit = Math.max(5, Number(req.query?.limit || 20));
    return res.json(buildVer9AiRanking(limit));
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'ver9 ranking failed'
    });
  }
});

app.get('/api/ver10/conference', async (req, res) => {
  const venueId = String(req.query?.venueId || '').trim();
  const raceNo = String(req.query?.raceNo || '').trim();
  if (!venueId || !raceNo) {
    return res.status(400).json({
      success: false,
      error: 'venueId and raceNo are required'
    });
  }

  try {
    const prediction = await predictRace(venueId, raceNo, {
      persistLearning: false,
      targetDate: String(req.query?.hd || req.query?.date || '').trim()
    });

    const testFlag = String(req.query?.test || '').toLowerCase();
    const allowTestOverride = testFlag === '1' || testFlag === 'true' || testFlag === 'on';
    if (allowTestOverride) {
      const testExpectedValue = Number(req.query?.testExpectedValue);
      const testTopScore = Number(req.query?.testTopScore);
      const testRoughLevel = String(req.query?.testRoughLevel || '').trim();

      if (Number.isFinite(testExpectedValue) && testExpectedValue > 0) {
        if (Array.isArray(prediction?.valueRanking) && prediction.valueRanking[0]) {
          prediction.valueRanking[0].expectedValue = testExpectedValue;
        }
        if (Array.isArray(prediction?.buyDetails) && prediction.buyDetails[0]) {
          prediction.buyDetails[0].expectedValue = testExpectedValue;
        }
      }

      if (Number.isFinite(testTopScore) && testTopScore > 0) {
        if (Array.isArray(prediction?.score) && prediction.score[0]) {
          prediction.score[0].score = testTopScore;
        }
      }

      if (testRoughLevel) {
        prediction.roughRace = {
          ...(prediction.roughRace || {}),
          roughLevel: testRoughLevel
        };
      }
    }

    const conference = buildAiConference(prediction);
    return res.json({
      success: true,
      venueId,
      raceNo,
      conference
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'ver10 conference failed'
    });
  }
});

app.get('/api/ver11/headcoach', async (req, res) => {
  const venueId = String(req.query?.venueId || '').trim();
  const raceNo = String(req.query?.raceNo || '').trim();
  if (!venueId || !raceNo) {
    return res.status(400).json({
      success: false,
      error: 'venueId and raceNo are required'
    });
  }

  try {
    const prediction = await predictRace(venueId, raceNo, { persistLearning: false });
    const headCoach = buildHeadCoach({
      ...prediction,
      venueId,
      raceNo
    });

    return res.json({
      success: true,
      prediction,
      headCoach
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'head coach failed'
    });
  }
});

app.get('/api/recommend/today', async (req, res) => {
  try {
    const payload = await recommendTodayRaces();
    return res.json({
      success: true,
      ...payload
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'recommend failed'
    });
  }
});

app.get('/api/recommend/tomorrow', async (req, res) => {
  try {
    const payload = await recommendTomorrowRaces();
    return res.json({
      success: true,
      ...payload
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'recommend failed'
    });
  }
});

app.get('/api/recommend/date/:date', async (req, res) => {
  const { date } = req.params;
  if (!/^\d{8}$/.test(String(date || ''))) {
    return res.status(400).json({
      success: false,
      error: 'date must be YYYYMMDD'
    });
  }

  try {
    const payload = await recommendRacesByDateApi(date);
    return res.json({
      success: true,
      ...payload
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'recommend failed'
    });
  }
});

app.post('/api/money/calculate', async (req, res) => {
  const bankroll = Number(req.body?.bankroll ?? 0);
  const { venueId, raceNo } = req.body || {};

  try {
    const prediction = await predictRace(String(venueId || ''), String(raceNo || ''), { persistLearning: false });
    const valueRanking = Array.isArray(prediction?.valueRanking) ? prediction.valueRanking : [];
    const topValueTicket = valueRanking.find((row) => Number(row?.expectedValue || 0) >= 100) || valueRanking[0] || null;
    const leagueConfidence = Array.isArray(prediction?.league)
      ? prediction.league.reduce((max, row) => Math.max(max, Number(row?.confidence || 0)), 0)
      : 0;
    const plan = calculateMoneyManagementPlan({
      bankroll,
      expectedValue: topValueTicket?.expectedValue ?? 0,
      confidence: prediction?.score?.[0]?.score ?? leagueConfidence,
      roughLevel: prediction?.roughRace?.roughLevel ?? '',
      decision: prediction?.decision?.decision ?? '見送り'
    });

    return res.json({
      success: true,
      ...plan
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'money calculate failed'
    });
  }
});

app.post('/api/model/train', async (req, res) => {
  try {
    const model = await Promise.resolve(trainModel({}));
    return res.json({
      success: true,
      model
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'model train failed'
    });
  }
});

app.get('/api/model/status', (req, res) => {
  try {
    return res.json({
      success: true,
      status: getModelStatus()
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'model status failed'
    });
  }
});

app.get('/api/automation/status', (req, res) => {
  return res.json({
    success: true,
    status: dailyAutomationState
  });
});

app.get('/api/weights', (req, res) => {
  try {
    return res.json(getWeightsSnapshot());
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'weights failed'
    });
  }
});

app.post('/api/weights/reset', (req, res) => {
  try {
    return res.json({
      success: true,
      weights: resetAiWeights()
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'weights reset failed'
    });
  }
});

app.get('/api/database/status', async (req, res) => {
  try {
    const status = await getDataHubDatabaseStatus();
    const legacy = getDatabaseStatus();
    return res.json({
      dbPath: String(status?.dbPath || ''),
      latestDate: String(status?.latestDate || ''),
      counts: {
        venues: Number(status?.counts?.venues || 0),
        races: Number(status?.counts?.races || 0),
        entries: Number(status?.counts?.entries || 0),
        results: Number(status?.counts?.results || 0),
        weather: Number(status?.counts?.weather || 0),
        motors: Number(status?.counts?.motors || 0),
        boats: Number(status?.counts?.boats || 0)
      },
      legacy: {
        totalRaces: Number(legacy?.totalRaces || 0),
        latestDate: String(legacy?.latestDate || ''),
        venues: Number(legacy?.venues || 0)
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'database status failed'
    });
  }
});

app.post('/api/database/import', async (req, res) => {
  try {
    const date = String(req.body?.date || '').trim() || new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const venueId = String(req.body?.venueId || '').trim();
    const result = await importRaceDate(date, {
      venueId,
      venueIds: req.body?.venueIds,
      maxRacesPerVenue: req.body?.maxRacesPerVenue
    });
    return res.json({
      success: true,
      imported: Number(result?.importedCount || 0),
      message: 'import completed'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'database import failed'
    });
  }
});

app.post('/api/database/import-range', async (req, res) => {
  try {
    const result = await importRaceRange({
      dateFrom: req.body?.dateFrom,
      dateTo: req.body?.dateTo,
      venueIds: req.body?.venueIds,
      maxRacesPerVenue: req.body?.maxRacesPerVenue
    });

    return res.json({
      success: true,
      imported: Number(result?.imported || 0),
      updated: Number(result?.updated || 0),
      failed: Number(result?.failed || 0),
      totalRaces: Number(result?.totalRaces || 0),
      failedDetails: Array.isArray(result?.failedDetails) ? result.failedDetails : [],
      progressLogs: Array.isArray(result?.progressLogs) ? result.progressLogs : []
    });
  } catch (error) {
    const message = error.message || 'database import-range failed';
    const isValidationError = /must be|<=|at least|valid venue|YYYYMMDD/.test(message);
    return res.status(isValidationError ? 400 : 500).json({
      success: false,
      error: message
    });
  }
});

app.post('/api/ver12/import', async (req, res) => {
  try {
    const status = getImportControlStatus();
    if (status?.running) {
      return res.status(409).json({
        success: false,
        error: 'import already running',
        status
      });
    }

    const options = {
      dateFrom: req.body?.dateFrom,
      dateTo: req.body?.dateTo,
      venueIds: req.body?.venueIds,
      maxRacesPerVenue: req.body?.maxRacesPerVenue,
      dayMaxLimit: req.body?.dayMaxLimit,
      continueOnFailure: req.body?.continueOnFailure,
      resume: req.body?.resume
    };

    ver12ImportPromise = importRaceRangeVer12(options)
      .catch((error) => {
        return {
          success: false,
          error: error?.message || 'ver12 import failed'
        };
      })
      .finally(() => {
        ver12ImportPromise = null;
      });

    const startedStatus = getImportControlStatus();
    return res.json({
      success: true,
      started: true,
      jobId: startedStatus?.lastJobId || '',
      status: startedStatus
    });
  } catch (error) {
    const message = error.message || 'ver12 import start failed';
    const isValidationError = /must be|<=|at least|valid venue|YYYYMMDD|already running/.test(message);
    return res.status(isValidationError ? 400 : 500).json({
      success: false,
      error: message
    });
  }
});

app.post('/api/ver12/import/stop', (req, res) => {
  try {
    const result = requestImportStop();
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'ver12 import stop failed'
    });
  }
});

app.get('/api/ver12/import/status', async (req, res) => {
  try {
    const status = getImportControlStatus();
    return res.json({
      success: true,
      status
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'ver12 import status failed'
    });
  }
});

app.get('/api/ver12/database/status', (req, res) => {
  try {
    const legacy = getDatabaseStatus();
    const summary = getGlobalDatabaseSummary();
    return res.json({
      success: true,
      ...summary,
      legacy
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'ver12 database status failed'
    });
  }
});

app.get('/api/ver12/statistics/racer/:registrationNo', (req, res) => {
  try {
    const registrationNo = String(req.params?.registrationNo || '').trim();
    if (!registrationNo) {
      return res.status(400).json({
        success: false,
        error: 'registrationNo is required'
      });
    }
    const statistics = getVer12RacerStatistics(registrationNo);
    return res.json({
      success: true,
      statistics
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'ver12 racer statistics failed'
    });
  }
});

app.get('/api/ver12/statistics/motor/:motorNo', (req, res) => {
  try {
    const motorNo = String(req.params?.motorNo || '').trim();
    if (!motorNo) {
      return res.status(400).json({
        success: false,
        error: 'motorNo is required'
      });
    }
    const statistics = getVer12MotorStatistics(motorNo);
    return res.json({
      success: true,
      statistics
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'ver12 motor statistics failed'
    });
  }
});

app.get('/api/ver12/statistics/:venueId', (req, res) => {
  try {
    const venueId = String(req.params?.venueId || '').trim();
    if (!venueId) {
      return res.status(400).json({
        success: false,
        error: 'venueId is required'
      });
    }
    const statistics = getVer12VenueStatistics(venueId);
    return res.json({
      success: true,
      statistics
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'ver12 venue statistics failed'
    });
  }
});

app.get('/api/database/import-log', (req, res) => {
  try {
    return res.json({
      success: true,
      logs: getImportLogSummary(50)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'database import log failed'
    });
  }
});

app.post('/api/optimizer/run', (req, res) => {
  try {
    return res.json(runOptimizer());
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'optimizer run failed'
    });
  }
});

app.get('/api/optimizer/history', (req, res) => {
  try {
    return res.json({
      success: true,
      history: getOptimizerHistory(100)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'optimizer history failed'
    });
  }
});

function startServer(port = PORT) {
  const server = app.listen(port, () => {
    console.log(`Boat AI server listening on port ${port}`);
  });

  server.on('error', (error) => {
    if (error && error.code === 'EADDRINUSE') {
      console.error(`port ${port} is already in use. Please stop the existing node process.`);
      process.exit(1);
      return;
    }

    console.error('Boat AI server failed to start:', error);
  });

  return server;
}

if (require.main === module) {
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
  });

  startServer();
}

module.exports = {
  app,
  startServer
};
