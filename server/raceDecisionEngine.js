const { toNumber } = require('./weatherEngine');

function buildStars(level) {
  return '★'.repeat(level).padEnd(5, '☆');
}

function budgetRate(level) {
  if (level >= 5) return '資金配分 5%';
  if (level >= 4) return '資金配分 3%';
  if (level >= 3) return '資金配分 2%';
  if (level >= 2) return '資金配分 1%';
  if (level >= 1) return '資金配分 0.5%';
  return '見送り';
}

function buildRaceDecision({ scoreRows, roughRace, buyDetails, confidence, odds, beforeInfo }) {
  const tickets = Array.isArray(buyDetails) ? buyDetails : [];
  const hasOfficialOdds = tickets.some((ticket) => {
    const source = String(ticket?.oddsSource || '');
    const oddsValue = toNumber(ticket?.odds, 0);
    return source === 'official' && oddsValue > 0;
  });
  if (!hasOfficialOdds) {
    return {
      decision: '見送り',
      reason: '公式3連単オッズ未取得',
      stakeLevel: 0,
      stakeStars: buildStars(0),
      recommendedBudgetRate: budgetRate(0)
    };
  }

  const strongCount = tickets.filter((ticket) => toNumber(ticket?.expectedValue, 0) >= 130).length;
  const decentCount = tickets.filter((ticket) => toNumber(ticket?.expectedValue, 0) >= 110).length;
  const topExpectedValue = tickets.reduce((max, ticket) => Math.max(max, toNumber(ticket?.expectedValue, 0)), 0);
  const roughLevel = String(roughRace?.roughLevel || '本命');
  const windSpeed = toNumber(beforeInfo?.windSpeed, 0);
  const waveHeight = toNumber(beforeInfo?.waveHeight, 0);
  const trust = toNumber(confidence, 0);

  let decision = '見送り';
  let reason = '期待値が低く、無理に買うレースではありません。';
  let stakeLevel = 0;

  if (strongCount >= 2 && trust >= 70 && roughLevel === '本命') {
    decision = '買い';
    reason = '期待値の高い買い目が複数あり、信頼度も高いです。';
    stakeLevel = 5;
  } else if (topExpectedValue >= 130 && trust >= 65 && roughLevel !== '大荒れ') {
    decision = '買い';
    reason = '期待値上位の買い目があり、軸も比較的安定しています。';
    stakeLevel = 4;
  } else if (decentCount >= 1 && (roughLevel === '荒れ' || roughLevel === '大荒れ' || windSpeed >= 5 || waveHeight >= 5)) {
    decision = '少額';
    reason = '荒れ気配あり。資金を抑えて狙い。';
    stakeLevel = 2;
  } else if (decentCount >= 1 && trust >= 55) {
    decision = '少額';
    reason = '妙味はあるものの、強気に張るレースではありません。';
    stakeLevel = 3;
  } else if (topExpectedValue >= 100 && trust >= 45) {
    decision = '少額';
    reason = '期待値は最低限あるため、抑えで少額が妥当です。';
    stakeLevel = 1;
  }

  return {
    decision,
    reason,
    stakeLevel,
    stakeStars: buildStars(stakeLevel),
    recommendedBudgetRate: budgetRate(stakeLevel)
  };
}

module.exports = {
  buildRaceDecision
};