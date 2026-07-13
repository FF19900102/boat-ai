const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_FILE_NAME = 'boat_ai_datahub_v1.sqlite';
const DB_PATH = path.join(__dirname, DB_FILE_NAME);
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db = null;
let initPromise = null;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const instance = new sqlite3.Database(DB_PATH, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(instance);
    });
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) {
        reject(error);
        return;
      }
      resolve({
        lastID: this.lastID,
        changes: this.changes
      });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(row || null);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(Array.isArray(rows) ? rows : []);
    });
  });
}

function exec(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

async function initDatabase() {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    if (!fs.existsSync(__dirname)) {
      fs.mkdirSync(__dirname, { recursive: true });
    }

    db = await openDatabase();
    await exec('PRAGMA foreign_keys = ON;');

    const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
    await exec(schemaSql);

    return {
      dbPath: DB_PATH,
      initialized: true
    };
  })();

  return initPromise;
}

function normalizeDate(input) {
  const digits = String(input || '').replace(/\D/g, '');
  if (/^\d{8}$/.test(digits)) {
    return digits;
  }
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

function toNumber(input, fallback = 0) {
  const value = Number(input);
  return Number.isFinite(value) ? value : fallback;
}

function toInteger(input, fallback = 0) {
  const value = parseInt(input, 10);
  return Number.isFinite(value) ? value : fallback;
}

function asText(input) {
  return String(input || '').trim();
}

function toJsonText(input, fallback) {
  try {
    return JSON.stringify(input == null ? fallback : input);
  } catch (_error) {
    return JSON.stringify(fallback);
  }
}

async function withTransaction(task) {
  await run('BEGIN TRANSACTION');
  try {
    const result = await task();
    await run('COMMIT');
    return result;
  } catch (error) {
    await run('ROLLBACK');
    throw error;
  }
}

function buildRaceKey(raceDate, venueId, raceNo) {
  return `${raceDate}-${venueId}-${raceNo}`;
}

function normalizeLane(entry, index) {
  const lane = toInteger(entry?.lane, 0);
  if (lane >= 1 && lane <= 6) {
    return lane;
  }
  return index + 1;
}

function normalizeRacePayload(raceInput) {
  const race = raceInput || {};
  const venueId = asText(race.venueId || race.venue || race.jcd);
  const venueName = asText(race.venueName || race.stadiumName || race.venueLabel);
  const region = asText(race.region || race.area);
  const raceDate = normalizeDate(race.date || race.raceDate || race.hd);
  const raceNo = toInteger(race.raceNo || race.rno || race.number, 0);

  const beforeInfo = race.beforeInfo || race.weather || {};
  const result = race.result || race.results || {};
  const entries = Array.isArray(race.entries) ? race.entries : [];

  const motors = Array.isArray(race.motors)
    ? race.motors
    : entries.map((entry, index) => ({
        lane: normalizeLane(entry, index),
        motorNo: entry?.motorNo || entry?.motor,
        twoRate: entry?.motor2Rate || entry?.motorWin2 || entry?.motorRate2,
        threeRate: entry?.motor3Rate || entry?.motorWin3 || entry?.motorRate3,
        raw: entry
      }));

  const boats = Array.isArray(race.boats)
    ? race.boats
    : entries.map((entry, index) => ({
        lane: normalizeLane(entry, index),
        boatNo: entry?.boatNo || entry?.boat,
        twoRate: entry?.boat2Rate || entry?.boatWin2 || entry?.boatRate2,
        threeRate: entry?.boat3Rate || entry?.boatWin3 || entry?.boatRate3,
        raw: entry
      }));

  return {
    venueId,
    venueName,
    region,
    raceDate,
    raceNo,
    title: asText(race.title || race.raceTitle),
    grade: asText(race.grade || race.raceGrade),
    deadline: asText(race.deadline || race.closeTime),
    status: asText(race.status),
    isFinal: result && result.order ? 1 : 0,
    rawRace: race,
    entries,
    weather: beforeInfo,
    result,
    motors,
    boats
  };
}

async function upsertVenue(normalized) {
  await run(
    `INSERT INTO venues (venue_id, name, region)
     VALUES (?, ?, ?)
     ON CONFLICT(venue_id) DO UPDATE SET
       name = excluded.name,
       region = excluded.region,
       updated_at = CURRENT_TIMESTAMP`,
    [normalized.venueId, normalized.venueName, normalized.region]
  );
}

async function upsertRace(normalized) {
  const raceKey = buildRaceKey(normalized.raceDate, normalized.venueId, normalized.raceNo);
  const existing = await get('SELECT id FROM races WHERE race_key = ?', [raceKey]);

  await run(
    `INSERT INTO races (
      race_key, race_date, venue_id, race_no, title, grade, deadline, status, is_final, raw_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(race_key) DO UPDATE SET
      race_date = excluded.race_date,
      venue_id = excluded.venue_id,
      race_no = excluded.race_no,
      title = excluded.title,
      grade = excluded.grade,
      deadline = excluded.deadline,
      status = excluded.status,
      is_final = excluded.is_final,
      raw_json = excluded.raw_json,
      updated_at = CURRENT_TIMESTAMP`,
    [
      raceKey,
      normalized.raceDate,
      normalized.venueId,
      normalized.raceNo,
      normalized.title,
      normalized.grade,
      normalized.deadline,
      normalized.status,
      normalized.isFinal,
      toJsonText(normalized.rawRace, {})
    ]
  );

  const row = await get('SELECT id FROM races WHERE race_key = ?', [raceKey]);
  return {
    raceId: toInteger(row?.id, 0),
    raceKey,
    action: existing ? 'updated' : 'inserted'
  };
}

async function replaceEntries(raceId, entries) {
  await run('DELETE FROM entries WHERE race_id = ?', [raceId]);

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index] || {};
    const lane = normalizeLane(entry, index);

    await run(
      `INSERT INTO entries (
        race_id, lane, registration_no, racer_name, branch, age, weight, f_count, l_count,
        avg_start_t, exhibition_time, motor_no, boat_no, raw_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        raceId,
        lane,
        asText(entry.registrationNo || entry.regNo || entry.id),
        asText(entry.racerName || entry.name),
        asText(entry.branch || entry.prefecture),
        toInteger(entry.age, 0),
        toNumber(entry.weight, 0),
        toInteger(entry.fCount || entry.f, 0),
        toInteger(entry.lCount || entry.l, 0),
        toNumber(entry.avgStart || entry.averageStart || entry.stAvg, 0),
        toNumber(entry.exhibitionTime || entry.exTime, 0),
        asText(entry.motorNo || entry.motor),
        asText(entry.boatNo || entry.boat),
        toJsonText(entry, {})
      ]
    );
  }
}

async function upsertResult(raceId, result) {
  const row = result || {};
  await run(
    `INSERT INTO results (
      race_id, order_text, kimarite, finishers_json, payouts_json, raw_json
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(race_id) DO UPDATE SET
      order_text = excluded.order_text,
      kimarite = excluded.kimarite,
      finishers_json = excluded.finishers_json,
      payouts_json = excluded.payouts_json,
      raw_json = excluded.raw_json,
      updated_at = CURRENT_TIMESTAMP`,
    [
      raceId,
      asText(row.order || row.orderText),
      asText(row.kimarite),
      toJsonText(Array.isArray(row.finishers) ? row.finishers : [], []),
      toJsonText(Array.isArray(row.payouts) ? row.payouts : [], []),
      toJsonText(row, {})
    ]
  );
}

async function upsertWeather(raceId, weather) {
  const row = weather || {};
  await run(
    `INSERT INTO weather (
      race_id, weather, wind_direction, wind_speed, wave_height,
      air_temperature, water_temperature, raw_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(race_id) DO UPDATE SET
      weather = excluded.weather,
      wind_direction = excluded.wind_direction,
      wind_speed = excluded.wind_speed,
      wave_height = excluded.wave_height,
      air_temperature = excluded.air_temperature,
      water_temperature = excluded.water_temperature,
      raw_json = excluded.raw_json,
      updated_at = CURRENT_TIMESTAMP`,
    [
      raceId,
      asText(row.weather),
      asText(row.windDirection || row.wind_direction),
      toNumber(row.windSpeed || row.wind_speed, 0),
      toNumber(row.waveHeight || row.wave_height, 0),
      toNumber(row.airTemperature || row.air_temperature, 0),
      toNumber(row.waterTemperature || row.water_temperature, 0),
      toJsonText(row, {})
    ]
  );
}

async function replaceMotors(raceId, motors) {
  await run('DELETE FROM motors WHERE race_id = ?', [raceId]);

  for (let index = 0; index < motors.length; index += 1) {
    const row = motors[index] || {};
    await run(
      `INSERT INTO motors (
        race_id, lane, motor_no, two_rate, three_rate, raw_json
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        raceId,
        normalizeLane(row, index),
        asText(row.motorNo || row.motor),
        toNumber(row.twoRate || row.two_rate || row.rate2, 0),
        toNumber(row.threeRate || row.three_rate || row.rate3, 0),
        toJsonText(row, {})
      ]
    );
  }
}

async function replaceBoats(raceId, boats) {
  await run('DELETE FROM boats WHERE race_id = ?', [raceId]);

  for (let index = 0; index < boats.length; index += 1) {
    const row = boats[index] || {};
    await run(
      `INSERT INTO boats (
        race_id, lane, boat_no, two_rate, three_rate, raw_json
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        raceId,
        normalizeLane(row, index),
        asText(row.boatNo || row.boat),
        toNumber(row.twoRate || row.two_rate || row.rate2, 0),
        toNumber(row.threeRate || row.three_rate || row.rate3, 0),
        toJsonText(row, {})
      ]
    );
  }
}

async function saveRaceData(raceInput) {
  await initDatabase();

  const normalized = normalizeRacePayload(raceInput);
  if (!normalized.venueId) {
    throw new Error('venueId is required');
  }
  if (!normalized.raceNo) {
    throw new Error('raceNo is required');
  }

  return withTransaction(async () => {
    await upsertVenue(normalized);
    const race = await upsertRace(normalized);

    await replaceEntries(race.raceId, normalized.entries);
    await upsertResult(race.raceId, normalized.result);
    await upsertWeather(race.raceId, normalized.weather);
    await replaceMotors(race.raceId, normalized.motors);
    await replaceBoats(race.raceId, normalized.boats);

    return {
      raceId: race.raceId,
      raceKey: race.raceKey,
      action: race.action
    };
  });
}

function parseJson(text, fallback) {
  try {
    return JSON.parse(String(text || ''));
  } catch (_error) {
    return fallback;
  }
}

async function getRace(filters = {}) {
  await initDatabase();

  const raceId = toInteger(filters.id, 0);
  const raceKey = asText(filters.raceKey);
  const venueId = asText(filters.venueId);
  const raceNo = toInteger(filters.raceNo, 0);
  const raceDate = normalizeDate(filters.date || filters.raceDate);

  let raceRow = null;
  if (raceId) {
    raceRow = await get('SELECT * FROM races WHERE id = ?', [raceId]);
  } else if (raceKey) {
    raceRow = await get('SELECT * FROM races WHERE race_key = ?', [raceKey]);
  } else if (venueId && raceNo) {
    raceRow = await get(
      'SELECT * FROM races WHERE venue_id = ? AND race_no = ? AND race_date = ?',
      [venueId, raceNo, raceDate]
    );
  }

  if (!raceRow) {
    return null;
  }

  const [venueRow, entryRows, resultRow, weatherRow, motorRows, boatRows] = await Promise.all([
    get('SELECT * FROM venues WHERE venue_id = ?', [raceRow.venue_id]),
    all('SELECT * FROM entries WHERE race_id = ? ORDER BY lane ASC', [raceRow.id]),
    get('SELECT * FROM results WHERE race_id = ?', [raceRow.id]),
    get('SELECT * FROM weather WHERE race_id = ?', [raceRow.id]),
    all('SELECT * FROM motors WHERE race_id = ? ORDER BY lane ASC', [raceRow.id]),
    all('SELECT * FROM boats WHERE race_id = ? ORDER BY lane ASC', [raceRow.id])
  ]);

  return {
    id: raceRow.id,
    raceKey: raceRow.race_key,
    date: raceRow.race_date,
    venueId: raceRow.venue_id,
    venueName: venueRow?.name || '',
    raceNo: raceRow.race_no,
    title: raceRow.title,
    grade: raceRow.grade,
    deadline: raceRow.deadline,
    status: raceRow.status,
    isFinal: Boolean(raceRow.is_final),
    race: parseJson(raceRow.raw_json, {}),
    entries: entryRows.map((row) => ({
      lane: row.lane,
      registrationNo: row.registration_no,
      racerName: row.racer_name,
      branch: row.branch,
      age: row.age,
      weight: row.weight,
      fCount: row.f_count,
      lCount: row.l_count,
      avgStart: row.avg_start_t,
      exhibitionTime: row.exhibition_time,
      motorNo: row.motor_no,
      boatNo: row.boat_no,
      raw: parseJson(row.raw_json, {})
    })),
    results: resultRow
      ? {
          order: resultRow.order_text,
          kimarite: resultRow.kimarite,
          finishers: parseJson(resultRow.finishers_json, []),
          payouts: parseJson(resultRow.payouts_json, []),
          raw: parseJson(resultRow.raw_json, {})
        }
      : null,
    weather: weatherRow
      ? {
          weather: weatherRow.weather,
          windDirection: weatherRow.wind_direction,
          windSpeed: weatherRow.wind_speed,
          waveHeight: weatherRow.wave_height,
          airTemperature: weatherRow.air_temperature,
          waterTemperature: weatherRow.water_temperature,
          raw: parseJson(weatherRow.raw_json, {})
        }
      : null,
    motors: motorRows.map((row) => ({
      lane: row.lane,
      motorNo: row.motor_no,
      twoRate: row.two_rate,
      threeRate: row.three_rate,
      raw: parseJson(row.raw_json, {})
    })),
    boats: boatRows.map((row) => ({
      lane: row.lane,
      boatNo: row.boat_no,
      twoRate: row.two_rate,
      threeRate: row.three_rate,
      raw: parseJson(row.raw_json, {})
    }))
  };
}

async function getHistory(filters = {}) {
  await initDatabase();

  const limit = Math.max(1, Math.min(500, toInteger(filters.limit, 100)));
  const offset = Math.max(0, toInteger(filters.offset, 0));
  const venueId = asText(filters.venueId);
  const dateFrom = asText(filters.dateFrom);
  const dateTo = asText(filters.dateTo);

  const where = [];
  const params = [];

  if (venueId) {
    where.push('r.venue_id = ?');
    params.push(venueId);
  }
  if (dateFrom) {
    where.push('r.race_date >= ?');
    params.push(normalizeDate(dateFrom));
  }
  if (dateTo) {
    where.push('r.race_date <= ?');
    params.push(normalizeDate(dateTo));
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const totalRow = await get(`SELECT COUNT(1) AS total FROM races r ${whereSql}`, params);

  const rows = await all(
    `SELECT
      r.id,
      r.race_key,
      r.race_date,
      r.venue_id,
      v.name AS venue_name,
      r.race_no,
      r.title,
      r.grade,
      r.deadline,
      r.status,
      r.is_final,
      rs.order_text,
      rs.kimarite
    FROM races r
    LEFT JOIN venues v ON v.venue_id = r.venue_id
    LEFT JOIN results rs ON rs.race_id = r.id
    ${whereSql}
    ORDER BY r.race_date DESC, r.venue_id ASC, r.race_no DESC
    LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    total: toInteger(totalRow?.total, 0),
    limit,
    offset,
    rows: rows.map((row) => ({
      id: row.id,
      raceKey: row.race_key,
      date: row.race_date,
      venueId: row.venue_id,
      venueName: row.venue_name || '',
      raceNo: row.race_no,
      title: row.title,
      grade: row.grade,
      deadline: row.deadline,
      status: row.status,
      isFinal: Boolean(row.is_final),
      resultOrder: row.order_text || '',
      kimarite: row.kimarite || ''
    }))
  };
}

async function getDatabaseStatus() {
  await initDatabase();

  const [
    venuesRow,
    racesRow,
    entriesRow,
    resultsRow,
    weatherRow,
    motorsRow,
    boatsRow,
    latestRow
  ] = await Promise.all([
    get('SELECT COUNT(1) AS count FROM venues'),
    get('SELECT COUNT(1) AS count FROM races'),
    get('SELECT COUNT(1) AS count FROM entries'),
    get('SELECT COUNT(1) AS count FROM results'),
    get('SELECT COUNT(1) AS count FROM weather'),
    get('SELECT COUNT(1) AS count FROM motors'),
    get('SELECT COUNT(1) AS count FROM boats'),
    get('SELECT MAX(race_date) AS latestDate FROM races')
  ]);

  return {
    dbPath: DB_PATH,
    latestDate: asText(latestRow?.latestDate),
    counts: {
      venues: toInteger(venuesRow?.count, 0),
      races: toInteger(racesRow?.count, 0),
      entries: toInteger(entriesRow?.count, 0),
      results: toInteger(resultsRow?.count, 0),
      weather: toInteger(weatherRow?.count, 0),
      motors: toInteger(motorsRow?.count, 0),
      boats: toInteger(boatsRow?.count, 0)
    }
  };
}

module.exports = {
  DB_PATH,
  initDatabase,
  saveRaceData,
  getRace,
  getHistory,
  getDatabaseStatus
};
