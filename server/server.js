const express = require('express');
const path = require('path');
const { parseTodayVenues, parseRaceList, parseRaceDetail, parseEntries, parseBeforeInfo, parseOdds, parseResult } = require('./parsers');
const { predictRace } = require('./aiEngine');
const { buildStats, getRecentHistory, buildLeagueStats } = require('./statsEngine');
const { getWeightsSnapshot, resetAiWeights } = require('./weightLearningEngine');
const { recommendTodayRaces } = require('./recommendEngine');
const { calculateMoneyManagementPlan } = require('./moneyManagementEngine');
const { trainModel, getModelStatus } = require('./mlEngine');
const { readRaceDatabase, getDatabaseStatus, importRaceDate, importRaceRange, getImportLogSummary } = require('./historyDatabaseEngine');
const { runOptimizer, getOptimizerHistory } = require('./optimizerEngine');
const { runBacktest, getBacktestHistory } = require('./backtestEngine');
const { getBestAiRecommendation, getBestAiSummary } = require('./bestAiEngine');

const app = express();
const PORT = process.env.PORT || 3001;
const publicDir = path.join(__dirname, '..');
const ALL_VENUE_IDS = ['kiryu', 'toda', 'edogawa', 'heiwajima', 'tamagawa', 'hamanako', 'gamagori', 'tokoname', 'tsu', 'mikuni', 'marugame', 'sakaide', 'kojima', 'miya'];
let dailyAutomationLock = false;
let dailyAutomationState = { date: '', status: 'idle', lastRunAt: '', detail: '' };

app.use(express.json());
app.use(express.static(publicDir));

function getTodayKey() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
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

app.get('/api/today-venues', (req, res) => {
  const html = '';
  res.json(parseTodayVenues(html));
});

app.get('/api/races/:venueId', (req, res) => {
  const html = '';
  res.json(parseRaceList(html));
});

app.get('/api/race/:venueId/:raceNo', (req, res) => {
  const html = '';
  res.json(parseRaceDetail(html));
});

app.get('/api/entries/:venueId/:raceNo', (req, res) => {
  const html = '';
  res.json(parseEntries(html));
});

app.get('/api/before/:venueId/:raceNo', (req, res) => {
  const html = '';
  res.json(parseBeforeInfo(html));
});

app.get('/api/odds/:venueId/:raceNo', (req, res) => {
  const html = '';
  res.json(parseOdds(html));
});

app.get('/api/result/:venueId/:raceNo', (req, res) => {
  const html = '';
  res.json(parseResult(html));
});

app.get('/api/official/today-venues', async (req, res) => {
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

    return res.json(parseTodayVenues(text));
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'fetch failed'
    });
  }
});

app.get('/api/official/races/:venueId', async (req, res) => {
  const { venueId } = req.params;
  const venueCodeMap = {
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

  const venueCode = venueCodeMap[venueId] || '';
  const targetUrl = venueCode
    ? `https://www.boatrace.jp/owpc/pc/race/raceindex?jcd=${venueCode}&hd=20260706`
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
  const venueCodeMap = {
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

  const venueCode = venueCodeMap[venueId] || '';
  const targetUrl = venueCode && raceNo
    ? `https://www.boatrace.jp/owpc/pc/race/racelist?rno=${raceNo}&jcd=${venueCode}&hd=20260706`
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
  const venueCodeMap = {
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

  const venueCode = venueCodeMap[venueId] || '';
  const candidateUrls = [
    `https://www.boatrace.jp/owpc/pc/race/odds?rno=${raceNo}&jcd=${venueCode}&hd=20260706`,
    `https://www.boatrace.jp/owpc/pc/race/odds?jcd=${venueCode}&rno=${raceNo}&hd=20260706`,
    `https://www.boatrace.jp/owpc/pc/race/odds3?rno=${raceNo}&jcd=${venueCode}&hd=20260706`,
    `https://www.boatrace.jp/owpc/pc/race/odds2?rno=${raceNo}&jcd=${venueCode}&hd=20260706`
  ];

  let html = '';
  for (const targetUrl of candidateUrls) {
    try {
      const response = await fetch(targetUrl);
      const text = await response.text();
      if (response.ok && text && !/予期せぬエラー|ログイン/.test(text)) {
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
      error: 'official odds page unavailable'
    });
  }

  return res.json(parseOdds(html, venueId, raceNo));
});

app.get('/api/official/result/:venueId/:raceNo', async (req, res) => {
  const { venueId, raceNo } = req.params;
  const venueCodeMap = {
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

  const venueCode = venueCodeMap[venueId] || '';
  const candidateUrls = [
    `https://www.boatrace.jp/owpc/pc/race/raceresult?rno=${raceNo}&jcd=${venueCode}&hd=20260706`,
    `https://www.boatrace.jp/owpc/pc/race/raceresult?jcd=${venueCode}&rno=${raceNo}&hd=20260706`
  ];

  let html = '';
  for (const targetUrl of candidateUrls) {
    try {
      const response = await fetch(targetUrl);
      const text = await response.text();
      if (response.ok && text && !/予期せぬエラー|ログイン/.test(text)) {
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

  return res.json(parseResult(html, venueId, raceNo));
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
  const venueCodeMap = {
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

  const venueCode = venueCodeMap[venueId] || '';
  const targetUrl = venueCode && raceNo
    ? `https://www.boatrace.jp/owpc/pc/race/beforeinfo?rno=${raceNo}&jcd=${venueCode}&hd=20260706`
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

app.get('/api/recommend/today', async (req, res) => {
  try {
    return res.json(await recommendTodayRaces());
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

app.get('/api/database/status', (req, res) => {
  try {
    const status = getDatabaseStatus();
    return res.json({
      totalRaces: Number(status?.totalRaces || 0),
      latestDate: String(status?.latestDate || ''),
      venues: Number(status?.venues || 0)
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
