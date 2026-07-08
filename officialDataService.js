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

    let bootstrapPromise = null;
    let raceData = localRaceData;
    let players = localPlayers;
    let source = 'local-fallback';

    async function requestJson(pathname) {
      try {
        const response = await fetch(pathname);
        if (!response.ok) return null;
        return await response.json();
      } catch (error) {
        return null;
      }
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
      const payload = await requestJson('/api/today-venues');
      if (payload) {
        source = 'server-api';
        return payload;
      }
      return venueHomeData.map((item) => ({ ...item }));
    }

    async function getRaceList(venue) {
      const payload = await requestJson(`/api/races/${encodeURIComponent(venue)}`);
      if (payload) {
        source = 'server-api';
        return payload.map((race) => ({ ...race, venue }));
      }
      const schedule = raceScheduleDefaults[venue] || {};
      return Object.keys(schedule).map((raceNo) => ({
        venue,
        raceNo: Number(raceNo),
        source
      }));
    }

    async function getEntryList(venue, raceNo) {
      const payload = await requestJson(`/api/entries/${encodeURIComponent(venue)}/${raceNo}`);
      if (payload) {
        source = 'server-api';
        return payload;
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
      const payload = await requestJson(`/api/before/${encodeURIComponent(venue)}/${raceNo}`);
      if (payload) {
        source = 'server-api';
        return {
          venue,
          raceNo,
          start: payload.start || '10:45',
          close: payload.close || '10:20',
          status: payload.status || 'live',
          weather: payload.weather || '晴',
          windDir: payload.windDir || '向かい風',
          windSpeed: payload.windSpeed || 2,
          wave: payload.wave || 3,
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
      const payload = await requestJson(`/api/odds/${encodeURIComponent(venue)}/${raceNo}`);
      if (payload) {
        source = 'server-api';
        return {
          venue,
          raceNo,
          odds: payload.odds || null,
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
      const statusLabel = weather.status === 'live' ? '発売中' : '締切';
      return {
        venue,
        raceNo,
        status: weather.status,
        raceStatusLabel: statusLabel,
        source
      };
    }

    async function getRaceResult(venue, raceNo) {
      const payload = await requestJson(`/api/result/${encodeURIComponent(venue)}/${raceNo}`);
      if (payload) {
        source = 'server-api';
        return payload;
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
      getSource: () => source
    };
  }

  global.createDataHubService = createDataHubService;
  global.createOfficialDataService = createDataHubService;
})(window);
