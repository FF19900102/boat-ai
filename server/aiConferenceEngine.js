const { buildVer9AiRanking } = require('./aiRankingEngine');

const VER10_CONFERENCE_CONFIG = {
  threshold: {
    buyExpectedValueMin: 110,
    smallExpectedValueMin: 100,
    buyMinConfidence: 0.58,
    smallMinConfidence: 0.5,
    buyMinSupportRatio: 0.45
  },
  risk: {
    byRoughLevel: {
      本命: 0.18,
      中荒れ: 0.38,
      荒れ: 0.62,
      大荒れ: 0.82
    }
  },
  stars: {
    expectedValueWeight: 0.42,
    confidenceWeight: 0.28,
    performanceWeight: 0.2,
    riskWeight: 0.1
  },
  stake: {
    min: 500,
    max: 5000,
    buyBase: 1300,
    smallBase: 700
  }
};

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, toNumber(value, 0)));
}

function round1(value) {
  return Math.round(toNumber(value, 0) * 10) / 10;
}

function conferenceHistoryCorrection(prediction) {
  const totalRaces = toNumber(prediction?.historyStats?.venueStats?.totalRaces, 0);
  const lane1WinRate = toNumber(prediction?.historyStats?.venueStats?.lane1WinRate, 0);
  const minSample = toNumber(prediction?.historyStats?.samplePolicy?.minVenueSample, 60);
  if (totalRaces < minSample) {
    return {
      points: 0,
      note: totalRaces > 0 ? `会場統計サンプル不足(${totalRaces}件)` : ''
    };
  }

  const diff = lane1WinRate - 16.7;
  const points = Math.max(-6, Math.min(6, (diff / 20) * 3.2));
  return {
    points,
    note: points !== 0 ? `会場統計補正 ${points > 0 ? '+' : ''}${round1(points)}pt` : ''
  };
}

function normalizeDecisionText(value) {
  const text = String(value || '');
  if (text.includes('買い')) return '買い';
  if (text.includes('少額') || text.includes('注意')) return '少額';
  return '見送り';
}

function classifyDecisionByThreshold(expectedValue, confidence, supportRatio = 0.5) {
  const ev = toNumber(expectedValue, 0);
  const conf = clamp01(confidence);
  const support = clamp01(supportRatio);
  const threshold = VER10_CONFERENCE_CONFIG.threshold;

  if (ev >= threshold.buyExpectedValueMin && conf >= threshold.buyMinConfidence && support >= threshold.buyMinSupportRatio) {
    return '買い';
  }
  if (ev >= threshold.smallExpectedValueMin && conf >= threshold.smallMinConfidence) {
    return '少額';
  }
  return '見送り';
}

function buildStars(points) {
  const score = Math.max(1, Math.min(5, Math.round(Number(points) || 1)));
  return `${'★'.repeat(score)}${'☆'.repeat(5 - score)}`;
}

function roughRiskFromPrediction(prediction) {
  const level = String(prediction?.roughRace?.roughLevel || '本命');
  const map = VER10_CONFERENCE_CONFIG.risk.byRoughLevel;
  return clamp01(map[level] != null ? map[level] : map['中荒れ']);
}

function topConfidence(prediction) {
  const topScore = toNumber(sortScoreRows(prediction?.score)[0]?.score, 0);
  if (topScore > 1) {
    return clamp01(topScore / 100);
  }
  return clamp01(topScore);
}

function oddsTightRisk(prediction) {
  const topOdds = toNumber(prediction?.buyDetails?.[0]?.odds || prediction?.valueRanking?.[0]?.odds, 0);
  if (topOdds <= 0) return 0.5;
  if (topOdds < 4) return 0.75;
  if (topOdds < 7) return 0.5;
  return 0.25;
}

function hasOfficialOdds(prediction) {
  const rows = Array.isArray(prediction?.valueRanking) ? prediction.valueRanking : [];
  return rows.some((row) => String(row?.oddsSource || '') === 'official' && toNumber(row?.odds, 0) > 0);
}

function expectedValueScore(expectedValue) {
  const ev = toNumber(expectedValue, 0);
  return clamp01((ev - 80) / 40);
}

function performanceWeightScore(weight) {
  return clamp01((toNumber(weight, 1) - 0.7) / 1.5);
}

function unifiedStarPoints({ expectedValue, confidence, performanceWeight, roughRisk, decision }) {
  const w = VER10_CONFERENCE_CONFIG.stars;
  const evScore = expectedValueScore(expectedValue);
  const confScore = clamp01(confidence);
  const perfScore = performanceWeightScore(performanceWeight);
  const riskScore = 1 - clamp01(roughRisk);
  let raw =
    (evScore * w.expectedValueWeight) +
    (confScore * w.confidenceWeight) +
    (perfScore * w.performanceWeight) +
    (riskScore * w.riskWeight);

  if (decision === '見送り') raw = Math.min(raw, 0.62);
  if (toNumber(expectedValue, 0) < 100) raw = Math.min(raw, 0.58);

  const points = Math.max(1, Math.min(5, Math.round(raw * 5)));
  return points;
}

function sortScoreRows(scoreRows) {
  return [...(Array.isArray(scoreRows) ? scoreRows : [])].sort((a, b) => {
    const rankA = toNumber(a?.rank, 999);
    const rankB = toNumber(b?.rank, 999);
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    return toNumber(b?.score, 0) - toNumber(a?.score, 0);
  });
}

function pickUnderdogLane(scoreRows) {
  const rows = sortScoreRows(scoreRows);
  const lanePriority = rows
    .map((row) => toNumber(row?.lane, 0))
    .filter((lane) => lane >= 4)
    .sort((a, b) => a - b);
  if (lanePriority.length) {
    return lanePriority[0];
  }
  return toNumber(rows[2]?.lane || rows[rows.length - 1]?.lane, 0);
}

function pickAnchors(scoreRows, underdogLane) {
  const rows = sortScoreRows(scoreRows);
  const honmei = toNumber(rows[0]?.lane, 0);
  const taiko = toNumber(rows[1]?.lane, 0);
  const ana = underdogLane || toNumber(rows[2]?.lane, 0);
  return {
    honmei: honmei > 0 ? String(honmei) : '-',
    taiko: taiko > 0 ? String(taiko) : '-',
    ana: ana > 0 ? String(ana) : '-'
  };
}

function summarizeReasonByTopSignals(signals) {
  return signals
    .filter((item) => item)
    .slice(0, 3)
    .join(' / ');
}

function roleWeight(roleRanking, roleId) {
  const row = (Array.isArray(roleRanking) ? roleRanking : []).find((item) => String(item?.roleId || '') === String(roleId));
  return toNumber(row?.weight, 1);
}

function evaluateHonmeiAi(prediction, roleRanking) {
  const rows = sortScoreRows(prediction?.score);
  const top = rows[0] || {};
  const topLane = toNumber(top?.lane, 0);
  const topClass = String(top?.className || '');
  const topMotor = toNumber(top?.motorRate, 0);
  const topNational = toNumber(top?.nationalWinRate, 0);
  const topEv = toNumber(prediction?.buyDetails?.[0]?.expectedValue, 0);
  const baseDecision = normalizeDecisionText(prediction?.decision?.decision);
  const confidence = topConfidence(prediction);
  const roughRisk = roughRiskFromPrediction(prediction);
  const perfWeight = roleWeight(roleRanking, 'honmei');

  let supportRatio = 0.35;
  if (topLane === 1) supportRatio += 0.2;
  if (topClass === 'A1') supportRatio += 0.15;
  if (topMotor >= 45) supportRatio += 0.1;
  if (topNational >= 6.2) supportRatio += 0.1;
  supportRatio = clamp01(supportRatio - (roughRisk * 0.2));

  const decision = classifyDecisionByThreshold(topEv, confidence, supportRatio);
  const points = unifiedStarPoints({ expectedValue: topEv, confidence, performanceWeight: perfWeight, roughRisk, decision });

  return {
    roleId: 'honmei',
    roleName: '本命AI',
    points,
    stars: buildStars(points),
    anchors: pickAnchors(rows, pickUnderdogLane(rows)),
    expectedValue: round1(topEv),
    buyable: decision !== '見送り',
    decision,
    reason: summarizeReasonByTopSignals([
      topLane === 1 ? '1号艇重視で軸が明確' : '1号艇以外を軸に評価',
      topClass === 'A1' ? 'A1級を本線評価' : 'A1級優位は弱め',
      topMotor >= 45 ? 'モーター気配が良い' : 'モーター優位は限定的',
      baseDecision === '見送り' ? '原予測は慎重判断' : '原予測は購入寄り'
    ]),
    oddsMissing: !hasOfficialOdds(prediction)
  };
}

function evaluateAnaAi(prediction, roleRanking) {
  const rows = sortScoreRows(prediction?.score);
  const underdogLane = pickUnderdogLane(rows);
  const underdogRow = rows.find((row) => toNumber(row?.lane, 0) === underdogLane) || {};
  const underdogExhibition = toNumber(underdogRow?.exhibitionTime, 99);
  const underdogSt = toNumber(underdogRow?.avgST, 9);
  const underdogMotor = toNumber(underdogRow?.motorRate, 0);
  const valueRows = Array.isArray(prediction?.valueRanking) ? prediction.valueRanking : [];
  const topValue = valueRows[0] || prediction?.buyDetails?.[0] || {};
  const topEv = toNumber(topValue?.expectedValue, 0);
  const confidence = topConfidence(prediction);
  const roughRisk = roughRiskFromPrediction(prediction);
  const perfWeight = roleWeight(roleRanking, 'ana');

  let supportRatio = 0.3;
  if (underdogLane >= 4) supportRatio += 0.15;
  if (underdogExhibition > 0 && underdogExhibition <= 6.85) supportRatio += 0.15;
  if (underdogSt > 0 && underdogSt <= 0.17) supportRatio += 0.1;
  if (underdogMotor >= 40) supportRatio += 0.1;
  supportRatio = clamp01(supportRatio + (roughRisk * 0.12));

  const decision = classifyDecisionByThreshold(topEv, confidence, supportRatio);
  const points = unifiedStarPoints({ expectedValue: topEv, confidence, performanceWeight: perfWeight, roughRisk, decision });

  return {
    roleId: 'ana',
    roleName: '穴AI',
    points,
    stars: buildStars(points),
    anchors: pickAnchors(rows, underdogLane),
    expectedValue: round1(topEv),
    buyable: decision !== '見送り',
    decision,
    reason: summarizeReasonByTopSignals([
      underdogLane >= 4 ? `人気薄想定の${underdogLane}号艇を注視` : '外枠穴は弱め',
      underdogSt > 0 && underdogSt <= 0.17 ? 'STで先手期待' : 'STの優位は限定的',
      topEv >= 110 ? '配当期待値が高い' : '配当妙味は中位',
      roughRisk >= 0.6 ? '荒れ条件で穴向き' : '荒れ条件は中立'
    ]),
    oddsMissing: !hasOfficialOdds(prediction)
  };
}

function evaluateRecoveryAi(prediction, roleRanking) {
  const rows = sortScoreRows(prediction?.score);
  const valueRows = Array.isArray(prediction?.valueRanking) ? prediction.valueRanking : [];
  const buyableRows = valueRows.filter((row) => toNumber(row?.expectedValue, 0) >= 100);
  const bestRow = buyableRows[0] || valueRows[0] || prediction?.buyDetails?.[0] || {};
  const topEv = toNumber(bestRow?.expectedValue, 0);
  const baseDecision = normalizeDecisionText(prediction?.decision?.decision);
  const confidence = topConfidence(prediction);
  const roughRisk = roughRiskFromPrediction(prediction);
  const perfWeight = roleWeight(roleRanking, 'recovery');

  let supportRatio = 0.3;
  if (buyableRows.length >= 1) supportRatio += 0.2;
  if (buyableRows.length >= 3) supportRatio += 0.15;
  if (baseDecision === '見送り' && topEv < 100) supportRatio += 0.05;
  supportRatio = clamp01(supportRatio - (roughRisk * 0.12));

  const decision = classifyDecisionByThreshold(topEv, confidence, supportRatio);
  const points = unifiedStarPoints({ expectedValue: topEv, confidence, performanceWeight: perfWeight, roughRisk, decision });

  return {
    roleId: 'recovery',
    roleName: '回収率AI',
    points,
    stars: buildStars(points),
    anchors: pickAnchors(rows, pickUnderdogLane(rows)),
    expectedValue: round1(topEv),
    buyable: decision !== '見送り',
    decision,
    reason: summarizeReasonByTopSignals([
      topEv >= 100 ? '期待値100%以上のみ採用' : '期待値100%未満で見送り',
      buyableRows.length >= 2 ? '複数の妙味券がある' : '妙味券は限定的',
      baseDecision === '見送り' ? '見送り判断を優先' : '購入判断は慎重'
    ]),
    oddsMissing: !hasOfficialOdds(prediction)
  };
}

function evaluateRoughAi(prediction, roleRanking) {
  const rows = sortScoreRows(prediction?.score);
  const roughLevel = String(prediction?.roughRace?.roughLevel || '本命');
  const roughReasons = Array.isArray(prediction?.roughRace?.reasons) ? prediction.roughRace.reasons : [];
  const topEv = toNumber(prediction?.buyDetails?.[0]?.expectedValue || prediction?.valueRanking?.[0]?.expectedValue, 0);
  const confidence = topConfidence(prediction);
  const roughRisk = roughRiskFromPrediction(prediction);
  const perfWeight = roleWeight(roleRanking, 'rough');

  const hasFSignals = rows.some((row) => {
    const text = `${row?.fCount || ''}${row?.recentResults || ''}`;
    return /F/.test(String(text));
  });

  let supportRatio = 0.28;
  if (roughLevel === '荒れ') supportRatio += 0.1;
  if (roughLevel === '大荒れ') supportRatio += 0.15;
  if (roughReasons.some((reason) => /風|波/.test(String(reason)))) supportRatio += 0.15;
  if (hasFSignals) supportRatio += 0.08;
  supportRatio = clamp01(supportRatio + (roughRisk * 0.12));

  const decision = classifyDecisionByThreshold(topEv, confidence, supportRatio);
  const points = unifiedStarPoints({ expectedValue: topEv, confidence, performanceWeight: perfWeight, roughRisk, decision });

  return {
    roleId: 'rough',
    roleName: '荒れAI',
    points,
    stars: buildStars(points),
    anchors: pickAnchors(rows, pickUnderdogLane(rows)),
    expectedValue: round1(topEv),
    buyable: decision !== '見送り',
    decision,
    reason: summarizeReasonByTopSignals([
      `荒れ度判定: ${roughLevel}`,
      roughReasons.length ? String(roughReasons[0]) : '風・波の影響は中立',
      hasFSignals ? 'F持ち気配を警戒' : 'F持ち影響は限定的'
    ]),
    oddsMissing: !hasOfficialOdds(prediction)
  };
}

function conferenceVerdict(aiDecisions, roleRanking) {
  const roleMap = new Map((Array.isArray(roleRanking) ? roleRanking : []).map((row) => [String(row?.roleId || ''), row]));
  let weightSum = 0;
  let weightedExpectedValue = 0;
  let weightedConfidence = 0;
  let weightedBuySignal = 0;
  let weightedSmallSignal = 0;
  let weightedRisk = 0;
  let weightedOddsRisk = 0;
  let weightedOddsMissing = 0;

  const scored = (Array.isArray(aiDecisions) ? aiDecisions : []).map((row) => {
    const role = roleMap.get(String(row?.roleId || '')) || {};
    const weight = toNumber(role?.weight, 1);
    const expectedValue = toNumber(row?.expectedValue, 0);
    const confidence = clamp01(row?.confidence);
    const roughRisk = clamp01(row?.roughRisk);
    const localOddsRisk = clamp01(row?.oddsRisk);
    const oddsMissing = row?.oddsMissing ? 1 : 0;
    const decisionText = String(row?.decision || '見送り');
    const buySignal = decisionText === '買い' ? 1 : 0;
    const smallSignal = decisionText === '少額' ? 1 : 0;
    weightSum += weight;
    weightedExpectedValue += expectedValue * weight;
    weightedConfidence += confidence * weight;
    weightedBuySignal += buySignal * weight;
    weightedSmallSignal += smallSignal * weight;
    weightedRisk += roughRisk * weight;
    weightedOddsRisk += localOddsRisk * weight;
    weightedOddsMissing += oddsMissing * weight;
    return {
      ...row,
      weight,
      weightedScore: Math.round(toNumber(row?.points, 0) * weight * 100) / 100
    };
  });

  const expectedValue = weightSum > 0 ? weightedExpectedValue / weightSum : 0;
  const confidence = weightSum > 0 ? weightedConfidence / weightSum : 0;
  const buyRatio = weightSum > 0 ? weightedBuySignal / weightSum : 0;
  const smallRatio = weightSum > 0 ? weightedSmallSignal / weightSum : 0;
  const roughRisk = weightSum > 0 ? weightedRisk / weightSum : 0;
  const oddsRisk = weightSum > 0 ? weightedOddsRisk / weightSum : 0;
  const oddsMissingRatio = weightSum > 0 ? weightedOddsMissing / weightSum : 0;

  const threshold = VER10_CONFERENCE_CONFIG.threshold;
  let finalDecision = '見送り';
  const historyCorrection = conferenceHistoryCorrection(aiDecisions?.[0]?.predictionSource || {});
  const correctedExpectedValue = expectedValue + historyCorrection.points;
  if (oddsMissingRatio >= 0.5) {
    finalDecision = '見送り';
  } else if (correctedExpectedValue >= threshold.buyExpectedValueMin && confidence >= threshold.buyMinConfidence && buyRatio >= threshold.buyMinSupportRatio) {
    finalDecision = '買い';
  } else if (correctedExpectedValue >= threshold.smallExpectedValueMin && correctedExpectedValue < threshold.buyExpectedValueMin && confidence >= threshold.smallMinConfidence) {
    finalDecision = '少額';
  }

  const topSpeakers = [...scored]
    .sort((a, b) => toNumber(b.weightedScore, 0) - toNumber(a.weightedScore, 0))
    .slice(0, 2)
    .map((row) => `${row.roleName}(${row.stars})`);

  const buyLikeRatio = buyRatio + smallRatio;
  const disagreement = 1 - Math.max(buyLikeRatio, 1 - buyLikeRatio);

  let stake = 0;
  if (finalDecision === '買い') {
    const base = VER10_CONFERENCE_CONFIG.stake.buyBase * (correctedExpectedValue / 100) * (0.65 + buyRatio);
    stake = Math.round(Math.max(VER10_CONFERENCE_CONFIG.stake.min, Math.min(VER10_CONFERENCE_CONFIG.stake.max, base)) / 100) * 100;
  } else if (finalDecision === '少額') {
    const base = VER10_CONFERENCE_CONFIG.stake.smallBase * (correctedExpectedValue / 100) * (0.6 + Math.max(buyRatio, 0.25));
    stake = Math.round(Math.max(VER10_CONFERENCE_CONFIG.stake.min, Math.min(VER10_CONFERENCE_CONFIG.stake.max, base)) / 100) * 100;
  }

  const reasonFactors = [];
  if (finalDecision === '買い') {
    reasonFactors.push(`期待値${Math.round(correctedExpectedValue)}%が買い基準(${threshold.buyExpectedValueMin}%以上)を達成`);
    reasonFactors.push(`実績重み上位の${topSpeakers.join('・')}が支持`);
    if (roughRisk >= 0.6) {
      reasonFactors.push('荒れリスクは高めだが妙味を優先');
    } else {
      reasonFactors.push('荒れリスクが許容範囲');
    }
  } else if (finalDecision === '少額') {
    reasonFactors.push(`期待値${Math.round(correctedExpectedValue)}%で少額帯(${threshold.smallExpectedValueMin}〜${threshold.buyExpectedValueMin - 0.1}%)`);
    if (disagreement >= 0.35) reasonFactors.push('AI間の意見不一致があり、資金を抑制');
    if (roughRisk >= 0.6) reasonFactors.push('荒れリスクが高く、少額対応');
    if (reasonFactors.length < 2) reasonFactors.push('買い支持比率が十分でないため強気は回避');
  } else {
    if (oddsMissingRatio >= 0.5) reasonFactors.push('公式3連単オッズ未取得');
    if (correctedExpectedValue < threshold.smallExpectedValueMin) reasonFactors.push(`期待値不足(${Math.round(correctedExpectedValue)}%)`);
    if (disagreement >= 0.35) reasonFactors.push('AI間の意見不一致');
    if (roughRisk >= 0.6) reasonFactors.push('荒れリスクが高い');
    if (oddsRisk >= 0.65) reasonFactors.push('オッズ不足で妙味が薄い');
    if (reasonFactors.length === 0) reasonFactors.push('買い条件を満たす根拠が不足');
  }
  if (historyCorrection.note) {
    reasonFactors.push(historyCorrection.note);
  }

  return {
    finalDecision,
    expectedValue: round1(correctedExpectedValue),
    purchaseAmount: stake,
    reason: reasonFactors.slice(0, 3).join(' / '),
    confidenceStars: buildStars(Math.max(1, Math.min(5, Math.round(clamp01(confidence) * 5)))),
    metrics: {
      confidence: round1(confidence * 100),
      buyRatio: round1(buyRatio * 100),
      smallRatio: round1(smallRatio * 100),
      roughRisk: round1(roughRisk * 100),
      disagreement: round1(disagreement * 100),
      historyCorrection: round1(historyCorrection.points)
    }
  };
}

function buildAiConference(prediction) {
  const ver9 = buildVer9AiRanking(20);
  const roleRanking = Array.isArray(ver9?.roleRanking) ? ver9.roleRanking : [];
  const roughRisk = roughRiskFromPrediction(prediction);
  const baseConfidence = topConfidence(prediction);
  const localOddsRisk = oddsTightRisk(prediction);

  const aiDecisions = [
    evaluateHonmeiAi(prediction, roleRanking),
    evaluateAnaAi(prediction, roleRanking),
    evaluateRecoveryAi(prediction, roleRanking),
    evaluateRoughAi(prediction, roleRanking)
  ].map((row) => ({
    ...row,
    confidence: baseConfidence,
    roughRisk,
    oddsRisk: localOddsRisk,
    predictionSource: prediction
  }));

  const verdict = conferenceVerdict(aiDecisions, roleRanking);

  return {
    success: true,
    generatedAt: new Date().toISOString(),
    aiDecisions,
    roleRanking,
    verdict,
    config: VER10_CONFERENCE_CONFIG.threshold
  };
}

module.exports = {
  buildAiConference
};
