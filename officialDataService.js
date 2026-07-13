(function (global) {
  async function loadJson(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('json load failed');
      return await response.json();
    } catch (error) {
      return null;
    }
  }

  function createDataHubService(options = {}) {
    const {
      venues = [],
      raceScheduleDefaults = {},
      venueHomeData = [],
      resultData = {},
      localRaceData = {},
      localPlayers = [],
      fallbackEntries = []
    } = options;

    const venueNameById = Object.fromEntries(
      (Array.isArray(venues) ? venues : []).map((name) => [
        String(name || '')
          .normalize('NFKC')
          .toLowerCase()
          .replace(/\s+/g, ''),
        String(name || '')
      ])
    );

    const venueIdByName = {
      '桐生': 'kiryu', '戸田': 'toda', '江戸川': 'edogawa', '平和島': 'heiwajima', '多摩川': 'tamagawa', '浜名湖': 'hamanako',
      '蒲郡': 'gamagori', '常滑': 'tokoname', '津': 'tsu', '三国': 'mikuni', 'びわこ': 'biwako', '住之江': 'suminoe',
      '尼崎': 'amagasaki', '鳴門': 'naruto', '丸亀': 'marugame', '児島': 'kojima', '宮島': 'miyajima', '徳山': 'tokuyama',
      '下関': 'shimonoseki', '若松': 'wakamatsu', '芦屋': 'ashiya', '福岡': 'fukuoka', '唐津': 'karatsu', '大村': 'omura'
    };
    const venueNameByIdMap = Object.fromEntries(
      Object.entries(venueIdByName).map(([name, id]) => [String(id), String(name)])
    );

    function normalizeVenueKey(value) {
      return String(value || '')
        .normalize('NFKC')
        .toLowerCase()
        .replace(/\s+/g, '');
    }

    function venueNameFromAny(value) {
      const raw = String(value || '').trim();
      if (!raw) return '';
      if (venueIdByName[raw]) return raw;
      if (venueNameByIdMap[raw]) return venueNameByIdMap[raw];
      const normalized = normalizeVenueKey(raw);
      if (venueNameById[normalized]) return venueNameById[normalized];
      return '';
    }

    function normalizeStatus(value) {
      const text = String(value || '').trim();
      if (!text) return '未公開';
      if (/発売中|open|live/i.test(text)) return '発売中';
      if (/締切|close|closed/i.test(text)) return '締切';
      if (/中止|休催|cancel/i.test(text)) return '中止';
      if (/結果|確定|final/i.test(text)) return '結果確定';
      return text;
    }

    function toNumber(value, fallback = 0) {
      const num = Number(value);
      return Number.isFinite(num) ? num : fallback;
    }

    let bootstrapPromise = null;
    let raceData = localRaceData;
    let players = localPlayers;
    let source = 'local-fallback';
    let lastError = '';
    const raceListCache = new Map();

    async function requestJson(pathname) {
      try {
        const response = await fetch(pathname);
        if (!response.ok) return null;
        const payload = await response.json();
        if (payload && payload.success === false) return null;
        return payload;
      } catch (error) {
        return null;
      }
    }

    async function requestOfficialThenLegacy(officialPath, legacyPath) {
      const official = await requestJson(officialPath);
      if (official != null) {
        lastError = '';
        return official;
      }
      lastError = `公式取得失敗: ${officialPath}`;
      if (!legacyPath) return null;
      return requestJson(legacyPath);
    }

    async function ensureBootstrap() {
      if (bootstrapPromise) return bootstrapPromise;
      bootstrapPromise = (async () => {
        const [raceJson, playerJson] = await Promise.all([
          loadJson('./data/races.json'),
          loadJson('./data/players.json')
        ]);
        if (raceJson) {
          raceData = raceJson;
          source = 'local-json';
        } else {
          raceData = localRaceData;
          source = 'local-fallback';
        }
        if (playerJson) {
          players = playerJson;
        } else {
          players = localPlayers;
        }
      })();
      return bootstrapPromise;
    }

    function mergeEntry(entry) {
      const player = players.find((item) => item.registrationNo === entry.registrationNo) || {};
      return {
        boat: entry.boat ?? 0,
        registrationNo: entry.registrationNo ?? player.registrationNo ?? 0,
        name: entry.name ?? player.name ?? '',
        branch: entry.branch ?? player.branch ?? '',
        className: entry.className ?? player.className ?? '',
        age: entry.age ?? player.age ?? 0,
        nationalWin: entry.nationalWin ?? player.nationalWin ?? 0,
        localWin: entry.localWin ?? player.localWin ?? 0,
        national2Win: entry.national2Win ?? player.national2Win ?? 0,
        local2Win: entry.local2Win ?? player.local2Win ?? 0,
        avgSt: entry.avgSt ?? player.avgSt ?? 0,
        motorRate: entry.motorRate ?? player.motorRate ?? 0,
        boatRate: entry.boatRate ?? player.boatRate ?? 0,
        exhibitionTime: entry.exhibitionTime ?? player.exhibitionTime ?? 0,
        weight: entry.weight ?? player.weight ?? 0,
        tilt: entry.tilt ?? player.tilt ?? 0,
        currentForm: entry.currentForm ?? player.currentForm ?? '',
        raceNo: entry.raceNo ?? 0
      };
    }

    async function getTodayVenues() {
      const payload = await requestOfficialThenLegacy('/api/official/today-venues', '/api/today-venues');
      if (Array.isArray(payload) && payload.length) {
        source = 'server-api';
        return payload
          .map((item) => {
            const venueName = venueNameFromAny(item?.venue || item?.venueName || item?.name || item?.venueId);
            if (!venueName) return null;
            return {
              venue: venueName,
              currentRace: toNumber(item?.currentRace, 0),
              closeTime: String(item?.deadline || item?.close || item?.closeTime || ''),
              weather: String(item?.weather || ''),
              windSpeed: toNumber(item?.windSpeed, 0)
            };
          })
          .filter(Boolean);
      }
      return venueHomeData.map((item) => ({ ...item }));
    }

    async function getRaceList(venue) {
      const venueId = venueIdByName[venue] || String(venue || '');
      const cacheKey = String(venueId || venue || '');
      if (!raceListCache.has(cacheKey)) {
        raceListCache.set(cacheKey, requestOfficialThenLegacy(
          `/api/official/races/${encodeURIComponent(venueId)}`,
          `/api/races/${encodeURIComponent(venueId)}`
        ));
      }

      const payload = await raceListCache.get(cacheKey);
      if (Array.isArray(payload) && payload.length) {
        source = 'server-api';
        return payload.map((race) => ({
          venue,
          raceNo: toNumber(race?.raceNo, 0),
          start: String(race?.start || race?.startTime || race?.deadline || ''),
          close: String(race?.close || race?.deadline || race?.startTime || ''),
          status: normalizeStatus(race?.status || race?.resultStatus || '')
        }));
      }

      const schedule = raceScheduleDefaults[venue] || {};
      const scheduleRows = Object.keys(schedule).map((raceNo) => ({
        venue,
        raceNo: Number(raceNo),
        start: String(schedule?.[raceNo]?.start || ''),
        close: String(schedule?.[raceNo]?.close || ''),
        status: normalizeStatus(schedule?.[raceNo]?.status || '')
      }));
      if (scheduleRows.length) return scheduleRows;

      await ensureBootstrap();
      const localVenueRows = raceData?.[venue] || {};
      const localRaceNos = Object.keys(localVenueRows)
        .map((raceNo) => Number(raceNo))
        .filter((raceNo) => Number.isFinite(raceNo) && raceNo > 0)
        .sort((a, b) => a - b);

      return localRaceNos.map((raceNo) => ({
        venue,
        raceNo,
        start: '',
        close: '',
        status: '未公開'
      }));
    }

    async function getEntryList(venue, raceNo) {
      const venueId = venueIdByName[venue] || String(venue || '');
      const payload = await requestOfficialThenLegacy(
        `/api/official/entries/${encodeURIComponent(venueId)}/${raceNo}`,
        `/api/entries/${encodeURIComponent(venueId)}/${raceNo}`
      );

      if (Array.isArray(payload) && payload.length) {
        source = 'server-api';
        return payload.map((entry, index) => ({
          boat: toNumber(entry?.boat || entry?.lane, index + 1),
          registrationNo: toNumber(entry?.registrationNo, 0),
          name: String(entry?.name || entry?.racerName || ''),
          branch: String(entry?.branch || ''),
          className: String(entry?.className || ''),
          age: toNumber(entry?.age, 0),
          nationalWin: toNumber(entry?.nationalWin || entry?.nationalWinRate, 0),
          localWin: toNumber(entry?.localWin || entry?.localWinRate, 0),
          national2Win: toNumber(entry?.national2Win, 0),
          local2Win: toNumber(entry?.local2Win, 0),
          avgSt: toNumber(entry?.avgSt || entry?.avgST || entry?.startTiming, 0),
          motorRate: toNumber(entry?.motorRate, 0),
          boatRate: toNumber(entry?.boatRate, 0),
          exhibitionTime: toNumber(entry?.exhibitionTime, 0),
          weight: toNumber(entry?.weight, 0),
          tilt: toNumber(entry?.tilt, 0),
          currentForm: String(entry?.currentForm || entry?.recentResults || ''),
          raceNo: toNumber(raceNo, 0),
          motorNo: String(entry?.motorNo || ''),
          boatNo: String(entry?.boatNo || '')
        }));
      }

      await ensureBootstrap();
      const raceEntries = raceData?.[venue]?.[String(raceNo)] || raceData?.[venue]?.[raceNo];
      if (Array.isArray(raceEntries) && raceEntries.length) {
        return raceEntries.map((entry) => mergeEntry(entry));
      }
      if (players.length) {
        return players.slice(0, 6).map((player, index) => mergeEntry({ ...player, boat: index + 1, raceNo: Number(raceNo) }));
      }
      return fallbackEntries;
    }

    async function getWeather(venue, raceNo) {
      const venueId = venueIdByName[venue] || String(venue || '');
      const [payload, raceList] = await Promise.all([
        requestOfficialThenLegacy(
          `/api/official/before/${encodeURIComponent(venueId)}/${raceNo}`,
          `/api/before/${encodeURIComponent(venueId)}/${raceNo}`
        ),
        getRaceList(venue)
      ]);
      const raceInfo = (Array.isArray(raceList) ? raceList : []).find((row) => Number(row?.raceNo) === Number(raceNo)) || {};

      if (payload) {
        source = 'server-api';
        return {
          venue,
          raceNo,
          start: String(raceInfo?.start || payload.start || payload.startTime || ''),
          close: String(raceInfo?.close || payload.close || payload.deadline || ''),
          status: normalizeStatus(raceInfo?.status || payload.status || ''),
          weather: payload.weather || '晴',
          windDir: payload.windDir || payload.windDirection || '向かい風',
          windSpeed: payload.windSpeed || 2,
          wave: payload.wave || payload.waveHeight || 3,
          exhibitionTime: payload.exhibitionTime || '',
          startDisplay: payload.startDisplay || '',
          source: 'server-api'
        };
      }
      const defaults = raceScheduleDefaults[venue]?.[String(raceNo)] || raceScheduleDefaults[venue]?.[raceNo] || {
        start: '10:45', close: '10:20', status: 'live', weather: '晴', windDir: '向かい風', windSpeed: 2, wave: 3
      };
      return {
        venue,
        raceNo,
        start: defaults.start || '10:45',
        close: defaults.close || '10:20',
        status: defaults.status || 'live',
        weather: defaults.weather || '晴',
        windDir: defaults.windDir || '向かい風',
        windSpeed: defaults.windSpeed || 2,
        wave: defaults.wave || 3,
        source
      };
    }

    async function getOdds(venue, raceNo) {
      const venueId = venueIdByName[venue] || String(venue || '');
      const payload = await requestOfficialThenLegacy(
        `/api/official/odds/${encodeURIComponent(venueId)}/${raceNo}`,
        `/api/odds/${encodeURIComponent(venueId)}/${raceNo}`
      );
      if (payload) {
        source = 'server-api';
        return {
          venue,
          raceNo,
          odds: {
            trifecta: Array.isArray(payload.trifecta) ? payload.trifecta : [],
            exacta: Array.isArray(payload.exacta) ? payload.exacta : [],
            quinellaPlace: Array.isArray(payload.quinellaPlace) ? payload.quinellaPlace : []
          },
          market: 'server-api',
          source: 'server-api'
        };
      }
      return {
        venue,
        raceNo,
        odds: null,
        market: 'local-preview',
        source
      };
    }

    async function getRaceStatus(venue, raceNo) {
      const weather = await getWeather(venue, raceNo);
      const normalized = normalizeStatus(weather.status);
      const statusLabel = normalized === '発売中' ? '発売中' : normalized === '締切' ? '締切' : normalized;
      return {
        venue,
        raceNo,
        status: normalized,
        raceStatusLabel: statusLabel,
        source
      };
    }

    async function getRaceResult(venue, raceNo) {
      const venueId = venueIdByName[venue] || String(venue || '');
      const payload = await requestOfficialThenLegacy(
        `/api/official/result/${encodeURIComponent(venueId)}/${raceNo}`,
        `/api/result/${encodeURIComponent(venueId)}/${raceNo}`
      );
      if (payload) {
        source = 'server-api';
        const payouts = Array.isArray(payload.payouts) ? payload.payouts : [];
        const trifecta = payouts.find((row) => String(row?.type || '').includes('3連単')) || null;
        return {
          isFinal: Boolean(payload?.isFinal || payload?.order),
          order: String(payload?.order || ''),
          winMethod: String(payload?.kimarite || ''),
          payout: trifecta?.payout ? `${Number(trifecta.payout).toLocaleString('ja-JP')}円` : '',
          confirmedAt: String(payload?.confirmedAt || ''),
          trifectaPayout: Number(payload?.trifectaPayout || trifecta?.payout || 0),
          exactaPayout: Number(payload?.exactaPayout || 0),
          quinellaPlacePayout: Number(payload?.quinellaPlacePayout || 0)
        };
      }
      return resultData[venue]?.[String(raceNo)] || resultData[venue]?.[raceNo] || null;
    }

    async function getRaceDetail(venue, raceNo) {
      const [entries, weather, result, odds, status] = await Promise.all([
        getEntryList(venue, raceNo),
        getWeather(venue, raceNo),
        getRaceResult(venue, raceNo),
        getOdds(venue, raceNo),
        getRaceStatus(venue, raceNo)
      ]);
      return {
        venue,
        raceNo,
        entries,
        weather,
        result,
        odds,
        status,
        source
      };
    }

    return {
      getTodayVenues,
      getRaceList,
      getRaceDetail,
      getRaceResult,
      getEntryList,
      getWeather,
      getOdds,
      getRaceStatus,
      getSource: () => source,
      getLastError: () => lastError
    };
  }

  global.createDataHubService = createDataHubService;
  global.createOfficialDataService = createDataHubService;
})(window);
