function toNumber(value, fallback = 0) {
  const number = Number.parseFloat(String(value ?? '').replace(/[^0-9.+-]/g, ''));
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundToHundred(value) {
  return Math.max(0, Math.round(toNumber(value, 0) / 100) * 100);
}

function splitStake(recommendedStake) {
  const stake = roundToHundred(recommendedStake);
  if (stake <= 0) {
    return { recommendedStake: 0, mainStake: 0, reserveStake: 0, holeStake: 0 };
  }

  const mainStake = roundToHundred(stake * 0.6);
  const reserveStake = roundToHundred(stake * 0.3);
  const holeStake = Math.max(0, stake - mainStake - reserveStake);

  return { recommendedStake: stake, mainStake, reserveStake, holeStake };
}

function buildReason({ decision, expectedValue, confidence, roughLevel }) {
  const ev = toNumber(expectedValue, 0);
  const trust = toNumber(confidence, 0);
  const level = String(roughLevel || '');

  if (decision === '見送り') {
    return '見送りのため資金配分なし';
  }

  if (ev >= 300) {
    return '期待値300%以上で増額';
  }

  if (ev < 120) {
    return '期待値120%未満のため減額';
  }

  if (ev >= 150 && trust >= 80 && level !== '大荒れ') {
    return '超期待値で強気';
  }

  if (decision === '買い') {
    if (ev >= 130 && trust >= 70) {
      return '期待値が高く信頼度も十分';
    }
    if (trust >= 80) {
      return '信頼度が高い';
    }
    return '買い判断';
  }

  if (decision === '少額') {
    if (level === '荒れ' || level === '大荒れ') {
      return '荒れ気配のため少額';
    }
    if (ev >= 110) {
      return '妙味あり、少額で狙う';
    }
    return '抑えで少額';
  }

  return '条件に応じて資金配分';
}

function calculateRate({ bankroll, expectedValue, confidence, roughLevel, decision }) {
  const ev = toNumber(expectedValue, 0);
  const trust = toNumber(confidence, 0);
  const level = String(roughLevel || '');
  const safeBankroll = Math.max(0, toNumber(bankroll, 0));

  if (safeBankroll <= 0 || decision === '見送り' || ev < 100) {
    return 0;
  }

  let valueAdjust = 1.0;
  if (ev >= 300) {
    valueAdjust = 1.2;
  } else if (ev < 120) {
    valueAdjust = 0.8;
  }

  if (decision === '少額') {
    let rate = 0.5;
    if (ev >= 110) rate += 0.2;
    if (ev >= 120) rate += 0.2;
    if (trust >= 75) rate += 0.1;
    if (level === '荒れ' || level === '大荒れ') rate -= 0.2;
    return clamp(Math.round(rate * valueAdjust * 10) / 10, 0.5, 1.2);
  }

  if (decision === '買い') {
    if (ev >= 150 && trust >= 80 && level !== '大荒れ') {
      return clamp(Math.round(5.0 * valueAdjust * 10) / 10, 2.0, 6.0);
    }

    let rate = 2.0;
    if (ev >= 120) rate += 0.3;
    if (ev >= 130) rate += 0.4;
    if (trust >= 70) rate += 0.2;
    if (trust >= 80) rate += 0.3;
    if (level === '本命') rate += 0.2;
    if (level === '荒れ') rate -= 0.2;
    if (level === '大荒れ') rate -= 0.5;

    return clamp(Math.round(rate * valueAdjust * 10) / 10, 1.5, 6.0);
  }

  return 0;
}

function calculateMoneyManagementPlan({ bankroll, expectedValue, confidence, roughLevel, decision }) {
  const bankrollValue = Math.max(0, toNumber(bankroll, 0));
  const bankrollRate = calculateRate({ bankroll: bankrollValue, expectedValue, confidence, roughLevel, decision });
  const recommendedStake = roundToHundred(bankrollValue * (bankrollRate / 100));
  const split = splitStake(recommendedStake);

  return {
    bankroll: bankrollValue,
    bankrollRate,
    ...split,
    reason: buildReason({ decision, expectedValue, confidence, roughLevel })
  };
}

module.exports = {
  calculateMoneyManagementPlan
};