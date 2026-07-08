const mockRaceList = Array.from({ length: 12 }, (_, index) => ({
  raceNo: index + 1,
  status: 'open',
  start: `${10 + Math.floor(index / 4)}:${30 + index * 2}`.padStart(5, '0')
}));

const venueIdMap = {
  桐生: 'kiryu',
  戸田: 'toda',
  江戸川: 'edogawa',
  平和島: 'heiwajima',
  多摩川: 'tamagawa',
  浜名湖: 'hamanako',
  蒲郡: 'gamagori',
  常滑: 'tokoname',
  津: 'tsu',
  三国: 'mikuni',
  丸亀: 'marugame',
  坂出: 'sakaide',
  児島: 'kojima',
  宮島: 'miya',
  徳山: 'tokuyama',
  下関: 'shimonoseki',
  若松: 'wakamatsu',
  芦屋: 'ashiya',
  福岡: 'fukuoka',
  大村: 'omura',
  びわこ: 'biwako',
  鳴門: 'naruto',
  住之江: 'suminoe',
  今津: 'imizu'
};

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

function decodeEntities(value) {
  return normalizeText(value)
    .replace(/&[a-zA-Z0-9#]+;/g, '');
}

function extractVenueName(rowHtml) {
  const imgMatch = rowHtml.match(/<img[^>]*alt=["']([^"']+)["']/i);
  if (imgMatch && imgMatch[1]) {
    return decodeEntities(imgMatch[1]).trim();
  }

  const text = decodeEntities(rowHtml);
  const textMatch = text.match(/([\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]+)(?:\s|$)/u);
  if (textMatch && textMatch[1]) {
    return textMatch[1].trim();
  }

  return '';
}

function inferVenueId(venueName) {
  if (!venueName) {
    return '';
  }

  if (venueIdMap[venueName]) {
    return venueIdMap[venueName];
  }

  return venueName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function extractStatus(text) {
  if (/中止|休催|休み|中断/.test(text)) {
    return 'cancelled';
  }
  if (/発売中/.test(text)) {
    return 'open';
  }
  if (/締切/.test(text)) {
    return 'closing';
  }
  return '';
}

function extractCurrentRace(text) {
  const match = text.match(/(\d+)R/);
  return match ? match[1] : '';
}

function extractDeadline(text) {
  const match = text.match(/(\d{1,2}:\d{2})/);
  return match ? match[1] : '';
}

function extractWeather(text) {
  const weatherMatch = text.match(/(晴|曇|雨|雪|風|霧|小雨|くもり)/);
  return weatherMatch ? weatherMatch[1] : '';
}

function extractWindSpeed(text) {
  const match = text.match(/風[^\d]*(\d+(?:\.\d+)?)/);
  return match ? match[1] : '';
}

function extractWaveHeight(text) {
  const match = text.match(/波[^\d]*(\d+(?:\.\d+)?)/);
  return match ? match[1] : '';
}

function parseTodayVenues(html) {
  if (!html || typeof html !== 'string') {
    return [];
  }

  try {
    const rowMatches = Array.from(html.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi));
    const venues = [];
    const seen = new Set();

    for (const rowMatch of rowMatches) {
      const rowHtml = rowMatch[0];
      const text = normalizeText(rowHtml);
      if (!text || /進行状況|レース別情報|レース場データ|開催期間|ボート\s*レース場/i.test(text)) {
        continue;
      }

      const venueName = extractVenueName(rowHtml);
      if (!venueName) {
        continue;
      }

      const key = venueName;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

      const venueText = normalizeText(rowHtml);
      venues.push({
        venueId: inferVenueId(venueName),
        venueName,
        status: extractStatus(venueText),
        currentRace: extractCurrentRace(venueText),
        deadline: extractDeadline(venueText),
        weather: extractWeather(venueText),
        windSpeed: extractWindSpeed(venueText),
        waveHeight: extractWaveHeight(venueText)
      });
    }

    if (venues.length === 0) {
      const fallbackText = decodeEntities(html);
      const fallbackNames = Array.from(new Set(fallbackText.match(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]+/g) || []));
      return fallbackNames
        .filter((name) => name.length >= 2)
        .slice(0, 12)
        .map((name) => ({
          venueId: inferVenueId(name),
          venueName: name,
          status: '',
          currentRace: '',
          deadline: '',
          weather: '',
          windSpeed: '',
          waveHeight: ''
        }));
    }

    return venues;
  } catch (error) {
    return [];
  }
}

function parseRaceList(html, venueId) {
  if (!html || typeof html !== 'string') {
    return [];
  }

  try {
    const rows = Array.from(html.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi));
    const races = [];

    for (const rowMatch of rows) {
      const rowHtml = rowMatch[0];
      const text = normalizeText(rowHtml);
      if (!text || !/\b\d+R\b/i.test(text)) {
        continue;
      }

      const raceNoMatch = rowHtml.match(/>(\d+)R<\/a>/i) || rowHtml.match(/>(\d+)R\s*</i);
      const raceNo = raceNoMatch ? raceNoMatch[1] : '';
      if (!raceNo) {
        continue;
      }

      const startTimeMatch = rowHtml.match(/>(\d{1,2}:\d{2})<\//i) || rowHtml.match(/>(\d{1,2}:\d{2})\s*</i);
      const startTime = startTimeMatch ? startTimeMatch[1] : '';

      const statusMatch = text.match(/(発売中|締切|中止|休催|発売前|発走前)/);
      const status = statusMatch ? statusMatch[1] : '';

      const resultStatusMatch = text.match(/(結果|未発表|発走済|開催終了|取り止め)/);
      const resultStatus = resultStatusMatch ? resultStatusMatch[1] : '';

      const raceNameMatch = rowHtml.match(/<a[^>]+href=[^>]+>([^<]+)<\/a>/i);
      const raceName = raceNameMatch ? decodeEntities(raceNameMatch[1]).trim() : '';

      races.push({
        venueId: venueId || '',
        raceNo,
        raceName,
        startTime,
        deadline: '',
        status,
        resultStatus
      });
    }

    if (races.length === 0) {
      return mockRaceList.map((race) => ({
        venueId: venueId || '',
        raceNo: String(race.raceNo),
        raceName: '',
        startTime: '',
        deadline: '',
        status: '',
        resultStatus: ''
      }));
    }

    return races;
  } catch (error) {
    return [];
  }
}

function parseRaceDetail(html) {
  return {
    title: 'server stub race detail',
    source: 'server-stub',
    rawHtml: Boolean(html)
  };
}

function toHalfWidthDigits(value) {
  return String(value || '').replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0));
}

function extractCellLines(cellHtml) {
  const raw = String(cellHtml || '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#160;/gi, ' ')
    .replace(/\r/g, '');

  return raw
    .split('\n')
    .map((line) => toHalfWidthDigits(normalizeText(line)))
    .filter(Boolean);
}

function normalizeName(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function createEmptyEntry(venueId, raceNo, lane) {
  return {
    venueId: venueId || '',
    raceNo: raceNo || '',
    lane: String(lane || ''),
    registrationNo: '',
    racerName: '',
    branch: '',
    className: '',
    age: '',
    weight: '',
    nationalWinRate: '',
    localWinRate: '',
    motorNo: '',
    motorRate: '',
    boatNo: '',
    boatRate: '',
    avgST: '',
    recentResults: ''
  };
}

function extractFirstMatch(text, regex) {
  const match = String(text || '').match(regex);
  return match ? normalizeName(match[1] || match[0]) : '';
}

function extractLooseEntryFromRow(rowHtml, venueId, raceNo) {
  const text = normalizeText(rowHtml);
  if (!text) {
    return null;
  }

  const laneMatch = text.match(/(?:艇番|枠|ボート|^|\s)([1-6])(?:号艇|艇|\s|$)/) || text.match(/is-boatColor([1-6])/i);
  const lane = laneMatch ? String(laneMatch[1]) : '';
  if (!lane) {
    return null;
  }

  const decimals = Array.from(text.matchAll(/\d+\.\d+/g)).map((match) => match[0]);
  const integers = Array.from(text.matchAll(/\b\d{1,4}\b/g)).map((match) => match[0]);

  const registrationNo = extractFirstMatch(text, /\b(\d{4,6})\b(?=\s*\/|\s*[AB][12]\b|\s*[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff])/u)
    || extractFirstMatch(text, /\b(\d{4,6})\b/);
  const className = extractFirstMatch(text, /\b([AB][12])\b/i).toUpperCase();
  const racerName = extractFirstMatch(text, /([\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]{2,8}(?:\s+[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]{1,8})?)/u);

  const avgST = extractFirstMatch(text, /(\d+\.\d{2})/);
  const nationalWinRate = decimals[0] || '';
  const localWinRate = decimals[1] || '';
  const motorRate = decimals[2] || '';
  const boatRate = decimals[3] || '';
  const motorNo = integers.find((value) => Number(value) > 0 && Number(value) <= 99) || '';
  const boatNo = integers.find((value) => Number(value) > 0 && Number(value) <= 99 && value !== motorNo) || '';

  return {
    venueId: venueId || '',
    raceNo: raceNo || '',
    lane,
    registrationNo,
    racerName,
    branch: '',
    className,
    age: '',
    weight: '',
    nationalWinRate,
    localWinRate,
    motorNo,
    motorRate,
    boatNo,
    boatRate,
    avgST,
    recentResults: ''
  };
}

function buildFallbackEntries(venueId, raceNo) {
  return Array.from({ length: 6 }, (_, index) => createEmptyEntry(venueId, raceNo, index + 1));
}

function parseEntries(html, venueId, raceNo) {
  if (!html || typeof html !== 'string') {
    return buildFallbackEntries(venueId, raceNo);
  }

  try {
    const normalizedHtml = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ');

    const tbodyBlocks = Array.from(normalizedHtml.matchAll(/<tbody\b[^>]*>[\s\S]*?<\/tbody>/gi))
      .map((match) => match[0]);

    const entries = [];

    const pushEntry = (entry) => {
      if (!entry || !entry.lane) {
        return;
      }
      if (entries.some((existing) => existing.lane === entry.lane)) {
        return;
      }
      entries.push({
        ...createEmptyEntry(venueId, raceNo, entry.lane),
        ...entry,
        venueId: venueId || '',
        raceNo: raceNo || '',
        lane: String(entry.lane),
        className: String(entry.className || '').toUpperCase().trim(),
        racerName: normalizeName(entry.racerName),
        registrationNo: toHalfWidthDigits(entry.registrationNo),
        nationalWinRate: String(entry.nationalWinRate || ''),
        localWinRate: String(entry.localWinRate || ''),
        motorNo: String(entry.motorNo || ''),
        motorRate: String(entry.motorRate || ''),
        boatNo: String(entry.boatNo || ''),
        boatRate: String(entry.boatRate || ''),
        avgST: String(entry.avgST || '')
      });
    };

    for (const tbodyHtml of tbodyBlocks) {
      const laneMatch = tbodyHtml.match(/<td[^>]*class=["'][^"']*is-boatColor[1-6][^"']*["'][^>]*rowspan=["']?4["']?[^>]*>\s*([０-９\d])\s*<\/td>/i)
        || tbodyHtml.match(/<td[^>]*rowspan=["']?4["']?[^>]*class=["'][^"']*is-boatColor[1-6][^"']*["'][^>]*>\s*([０-９\d])\s*<\/td>/i);
      if (laneMatch) {
        const lane = toHalfWidthDigits(laneMatch[1] || '').trim();

        const regClassMatch = tbodyHtml.match(/<div[^>]*class=["'][^"']*is-fs11[^"']*["'][^>]*>\s*([0-9０-９]{4,6})\s*\/\s*<span[^>]*>\s*([A-Za-z][0-9])\s*<\/span>/i);
        const registrationNo = regClassMatch ? toHalfWidthDigits(regClassMatch[1]) : '';
        const className = regClassMatch ? String(regClassMatch[2]).toUpperCase().trim() : '';

        const nameMatch = tbodyHtml.match(/<div[^>]*class=["'][^"']*is-fs18[^"']*["'][^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i);
        const racerName = nameMatch ? normalizeName(decodeEntities(nameMatch[1])) : '';

        const profileMatch = tbodyHtml.match(/<div[^>]*class=["'][^"']*is-fs11[^"']*["'][^>]*>\s*([^<\n]+\/[^^<\n]+)[\s\S]*?<br\s*\/?\s*>\s*([0-9０-９]{2})歳\s*\/\s*([0-9０-９.]+kg)/i);
        const branch = profileMatch ? toHalfWidthDigits(normalizeText(profileMatch[1])) : '';
        const age = profileMatch ? toHalfWidthDigits(profileMatch[2]) : '';
        const weight = profileMatch ? toHalfWidthDigits(profileMatch[3]) : '';

        const rowspanCells = Array.from(tbodyHtml.matchAll(/<td\b[^>]*rowspan=["']?4["']?[^>]*>([\s\S]*?)<\/td>/gi))
          .map((match) => match[1]);

        const cellLines = rowspanCells.map((cellHtml) => extractCellLines(cellHtml));
        const numericTriples = cellLines.filter((lines) => lines.length >= 3);

        const flCell = numericTriples.find((lines) => /F\d/i.test(lines[0] || '') && /L\d/i.test(lines[1] || '')) || [];
        const avgSTMatch = flCell.join(' ').match(/(\d+\.\d{2})/);
        const avgST = avgSTMatch ? avgSTMatch[1] : '';

        const rateCells = numericTriples.filter((lines) => /^\d+\.\d+$/.test(lines[0] || ''));
        const nationalWinRate = rateCells[0] ? rateCells[0][0] : '';
        const localWinRate = rateCells[1] ? rateCells[1][0] : '';

        const machineCells = numericTriples.filter((lines) => /^\d+$/.test(lines[0] || '') && /\d+\.\d+/.test(lines[1] || ''));
        const motorNo = machineCells[0] ? machineCells[0][0] : '';
        const motorRate = machineCells[0] ? machineCells[0][1] : '';
        const boatNo = machineCells[1] ? machineCells[1][0] : '';
        const boatRate = machineCells[1] ? machineCells[1][1] : '';

        pushEntry({
          venueId: venueId || '',
          raceNo: raceNo || '',
          lane,
          registrationNo,
          racerName,
          branch,
          className,
          age,
          weight,
          nationalWinRate,
          localWinRate,
          motorNo,
          motorRate,
          boatNo,
          boatRate,
          avgST,
          recentResults: ''
        });
        continue;
      }

      const loose = extractLooseEntryFromRow(tbodyHtml, venueId, raceNo);
      if (loose) {
        pushEntry(loose);
      }
    }

    const sortedEntries = entries
      .sort((a, b) => Number(a.lane) - Number(b.lane))
      .slice(0, 6);

    if (sortedEntries.length === 0) {
      return buildFallbackEntries(venueId, raceNo);
    }

    for (let lane = 1; lane <= 6; lane += 1) {
      if (!sortedEntries.some((entry) => Number(entry.lane) === lane)) {
        sortedEntries.push(createEmptyEntry(venueId, raceNo, lane));
      }
    }

    return sortedEntries
      .sort((a, b) => Number(a.lane) - Number(b.lane))
      .slice(0, 6);
  } catch (error) {
    return buildFallbackEntries(venueId, raceNo);
  }
}

function parseBeforeInfo(html, venueId, raceNo) {
  if (!html || typeof html !== 'string') {
    return {
      venueId: venueId || '',
      raceNo: raceNo || '',
      weather: '',
      windDirection: '',
      windSpeed: '',
      waveHeight: '',
      airTemperature: '',
      waterTemperature: '',
      entries: []
    };
  }

  try {
    const normalizedHtml = html.replace(/<script[\s\S]*?<\/script>/gi, ' ');
    const text = normalizeText(normalizedHtml);

    const weatherMatch = text.match(/(晴|曇|雨|雪|霧|くもり|小雨)/);
    const windDirectionMatch = text.match(/(北|北東|東|南東|南|南西|西|北西|向かい風|追い風|横風|追風|向風)/);
    const windSpeedMatch = text.match(/風速[^\d]*(\d+(?:\.\d+)?)/i) || text.match(/(\d+(?:\.\d+)?)m/i);
    const waveHeightMatch = text.match(/波高[^\d]*(\d+(?:\.\d+)?)/i) || text.match(/(\d+(?:\.\d+)?)cm/i);
    const airTempMatch = text.match(/気温[^\d]*(\d+(?:\.\d+)?)/i);
    const waterTempMatch = text.match(/水温[^\d]*(\d+(?:\.\d+)?)/i);

    const rows = Array.from(normalizedHtml.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi));
    const entryRows = rows
      .map((rowMatch) => rowMatch[0])
      .map((rowHtml) => normalizeText(rowHtml))
      .filter((rowText) => /展示|部品交換|進入|ST|着順|kg|R|シャフト/i.test(rowText));

    const entries = [];

    for (let index = 0; index < entryRows.length; index += 1) {
      const rowText = entryRows[index];
      const laneMatch = rowText.match(/(^|\s)([0-9０-９]+)(?=\s)/);
      const lane = laneMatch ? laneMatch[2] : '';

      const courseMatch = rowText.match(/進入[^\d]*(\d+)/i);
      const course = courseMatch ? courseMatch[1] : '';

      const exhibitionTimeMatch = rowText.match(/展示[\s\S]*?([0-9.]+)(?=\s|<)/i) || rowText.match(/([0-9.]+)\s*秒/i);
      const exhibitionTime = exhibitionTimeMatch ? exhibitionTimeMatch[1] : '';

      const exhibitionRankMatch = rowText.match(/着順[^\d]*(\d+)/i);
      const exhibitionRank = exhibitionRankMatch ? exhibitionRankMatch[1] : '';

      const tiltMatch = rowText.match(/チルト[^\d]*(\d+(?:\.\d+)?)/i);
      const tilt = tiltMatch ? tiltMatch[1] : '';

      const startTimingMatch = rowText.match(/ST[^\d]*(\d+(?:\.\d+)?)/i);
      const startTiming = startTimingMatch ? startTimingMatch[1] : '';

      const partsChangeMatch = rowText.match(/部品交換[^\d]*(.*)$/i);
      const partsChange = partsChangeMatch ? normalizeText(partsChangeMatch[1]) : '';

      if (lane || course || exhibitionTime || exhibitionRank || tilt || startTiming || partsChange) {
        entries.push({
          lane,
          course,
          exhibitionTime,
          exhibitionRank,
          tilt,
          startTiming,
          partsChange
        });
      }
    }

    return {
      venueId: venueId || '',
      raceNo: raceNo || '',
      weather: weatherMatch ? weatherMatch[1] : '',
      windDirection: windDirectionMatch ? windDirectionMatch[1] : '',
      windSpeed: windSpeedMatch ? windSpeedMatch[1] : '',
      waveHeight: waveHeightMatch ? waveHeightMatch[1] : '',
      airTemperature: airTempMatch ? airTempMatch[1] : '',
      waterTemperature: waterTempMatch ? waterTempMatch[1] : '',
      entries
    };
  } catch (error) {
    return {
      venueId: venueId || '',
      raceNo: raceNo || '',
      weather: '',
      windDirection: '',
      windSpeed: '',
      waveHeight: '',
      airTemperature: '',
      waterTemperature: '',
      entries: []
    };
  }
}

function parseOdds(html, venueId, raceNo) {
  const defaultPayload = {
    venueId: venueId || '',
    raceNo: raceNo || '',
    trifecta: [],
    exacta: [],
    quinella: [],
    quinellaPlace: []
  };

  if (!html || typeof html !== 'string') {
    return defaultPayload;
  }

  try {
    const normalizedHtml = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ');

    const sections = {
      trifecta: [],
      exacta: [],
      quinella: [],
      quinellaPlace: []
    };

    const blocks = Array.from(normalizedHtml.matchAll(/<(tr|li|div|p)\b[^>]*>[\s\S]*?<\/\1>/gi));
    let currentSection = '';

    const normalizeTicket = (value) => normalizeText(value)
      .replace(/\s+/g, '-')
      .replace(/[／・]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const extractTicket = (text) => {
      const match = text.match(/\b\d+(?:[・\-/／\s]+\d+){1,}\b/);
      return match ? normalizeTicket(match[0]) : '';
    };

    const extractOdds = (text) => {
      const decimalMatch = text.match(/(\d+\.\d+)/);
      if (decimalMatch) {
        return decimalMatch[1];
      }

      const integerMatch = text.match(/\b(\d{1,3})\b/);
      return integerMatch ? integerMatch[1] : '';
    };

    for (const blockMatch of blocks) {
      const blockHtml = blockMatch[0];
      const rowText = normalizeText(blockHtml);
      const sectionName = /3連単|三連単|trifecta/i.test(rowText)
        ? 'trifecta'
        : /2連単|exacta/i.test(rowText)
          ? 'exacta'
          : /2連複|quinella/i.test(rowText)
            ? 'quinella'
            : /拡連複|quinella place|quinellaplace/i.test(rowText)
              ? 'quinellaPlace'
              : '';

      if (sectionName) {
        currentSection = sectionName;
      }

      if (!currentSection) {
        continue;
      }

      const cellMatches = Array.from(blockHtml.matchAll(/<(td|th)\b[^>]*>[\s\S]*?<\/\1>/gi));
      const normalizedCells = cellMatches
        .map((match) => normalizeText(match[0]))
        .filter(Boolean);

      const ticketText = normalizedCells.map(extractTicket).find(Boolean) || '';
      const oddsText = normalizedCells
        .slice()
        .reverse()
        .map(extractOdds)
        .find((value) => Boolean(value)) || '';
      const rankText = normalizedCells.find((cell) => /^\d+$/.test(cell)) || '';

      if (!ticketText && !oddsText && !rankText) {
        continue;
      }

      const candidate = {
        rank: rankText,
        ticket: ticketText,
        odds: oddsText
      };

      if (candidate.ticket || candidate.odds || candidate.rank) {
        sections[currentSection].push(candidate);
      }
    }

    if (sections.trifecta.length === 0 && sections.exacta.length === 0 && sections.quinella.length === 0 && sections.quinellaPlace.length === 0) {
      const text = normalizeText(normalizedHtml);
      const ticketMatch = text.match(/\b\d+(?:[・\-/／\s]+\d+){1,}\b/);
      const oddsMatch = text.match(/(\d+\.\d+)/) || text.match(/\b(\d{2,3})\b/);
      if (ticketMatch) {
        sections.trifecta.push({
          rank: '1',
          ticket: normalizeTicket(ticketMatch[0]),
          odds: oddsMatch ? oddsMatch[1] : ''
        });
      }
    }

    return {
      venueId: venueId || '',
      raceNo: raceNo || '',
      trifecta: sections.trifecta,
      exacta: sections.exacta,
      quinella: sections.quinella,
      quinellaPlace: sections.quinellaPlace
    };
  } catch (error) {
    return defaultPayload;
  }
}

function parseResult(html, venueId, raceNo) {
  const defaultPayload = {
    venueId: venueId || '',
    raceNo: raceNo || '',
    order: '',
    kimarite: '',
    finishers: [],
    payouts: []
  };

  if (!html || typeof html !== 'string') {
    return defaultPayload;
  }

  try {
    const normalizedHtml = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ');
    const text = normalizeText(normalizedHtml);

    const kimariteMatch = text.match(/決まり手[^\u3040-\u30ff\u3400-\u4DBF\u4E00-\u9FFF]*([\u3040-\u30ff\u3400-\u4DBF\u4E00-\u9FFF]{1,8})/u);
    const kimarite = kimariteMatch ? kimariteMatch[1] : '';

    const finishers = [];
    const rowMatches = Array.from(normalizedHtml.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi));

    for (const rowMatch of rowMatches) {
      const rowHtml = rowMatch[0];
      const rowText = normalizeText(rowHtml);
      const headerText = rowText.replace(/\s+/g, '');

      if (!rowText || /着順|艇番|選手|ST|決まり手|タイム|レース|順位/i.test(rowText)) {
        continue;
      }

      const cellMatches = Array.from(rowHtml.matchAll(/<(td|th)\b[^>]*>[\s\S]*?<\/\1>/gi));
      const cells = cellMatches.map((match) => normalizeText(match[0])).filter(Boolean);

      if (cells.length < 3 || !/着順|艇番|選手|ST/i.test(headerText)) {
        continue;
      }

      const numericValues = cells
        .flatMap((cell) => Array.from(cell.matchAll(/\d+(?:\.\d+)?/g)).map((m) => m[0]))
        .filter(Boolean);

      const rank = cells.find((cell) => /^\d+$/.test(normalizeText(cell))) || '';
      const lane = cells.find((cell, idx) => idx > 0 && /^\d+$/.test(normalizeText(cell))) || '';
      const stValue = numericValues.find((value) => value.includes('.')) || '';
      const racerName = cells.find((cell) => /[\u3040-\u30ff\u3400-\u4DBF\u4E00-\u9FFF]/u.test(cell)) || '';

      if (!rank && !lane && !racerName && !stValue) {
        continue;
      }

      finishers.push({
        rank: rank.replace(/\s+/g, '').trim(),
        lane: lane.replace(/\s+/g, '').trim(),
        racerName: racerName.replace(/\s+/g, ' ').trim(),
        st: stValue
      });
    }

    const payoutLabels = ['3連単', '2連単', '3連複', '2連複', '拡連複', '単勝', '複勝'];
    const payouts = [];

    for (const label of payoutLabels) {
      const labelRegex = new RegExp(label, 'i');
      const matchedRows = rowMatches
        .map((rowMatch) => normalizeText(rowMatch[0]))
        .filter((rowText) => labelRegex.test(rowText));

      for (const rowText of matchedRows) {
        const ticketMatch = rowText.match(/\b\d+(?:[・\-/／\s]+\d+){1,}\b/);
        const payoutMatch = rowText.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)(?:円|円位)?/);
        const popularityMatch = rowText.match(/(\d+)(?:人気|人)/);

        const ticket = ticketMatch ? ticketMatch[0].replace(/\s+/g, '-').replace(/[／・]/g, '-') : '';
        const payout = payoutMatch ? payoutMatch[1].replace(/,/g, '') : '';

        payouts.push({
          type: label,
          ticket,
          payout,
          popularity: popularityMatch ? popularityMatch[1] : ''
        });
      }
    }

    return {
      venueId: venueId || '',
      raceNo: raceNo || '',
      order: finishers.map((finisher) => finisher.lane).filter(Boolean).join('-'),
      kimarite,
      finishers,
      payouts
    };
  } catch (error) {
    return defaultPayload;
  }
}

module.exports = {
  parseTodayVenues,
  parseRaceList,
  parseRaceDetail,
  parseEntries,
  parseBeforeInfo,
  parseOdds,
  parseResult
};
