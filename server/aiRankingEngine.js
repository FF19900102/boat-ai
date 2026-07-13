const { getBestAiSummary } = require('./bestAiEngine');

const VER10_ROLE_MAP = {
  honmei: {
    roleId: 'honmei',
    roleName: '本命AI',
    aiIds: ['AI-01', 'AI-03']
  },
  ana: {
    roleId: 'ana',
    roleName: '穴AI',
    aiIds: ['AI-05']
  },
  recovery: {
    roleId: 'recovery',
    roleName: '回収率AI',
    aiIds: ['AI-04']
  },
  rough: {
    roleId: 'rough',
    roleName: '荒れAI',
    aiIds: ['AI-02']
  }
};

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function findBestRowByAiIds(leaderboard, aiIds) {
  const rows = Array.isArray(leaderboard) ? leaderboard : [];
  let best = null;
  for (const row of rows) {
    if (!aiIds.includes(String(row?.aiId || ''))) {
      continue;
    }
    if (!best) {
      best = row;
      continue;
    }
    const rankA = toNumber(best.rank, 999);
    const rankB = toNumber(row.rank, 999);
    if (rankB < rankA) {
      best = row;
    }
  }
  return best;
}

function buildInfluenceWeight(row) {
  if (!row) {
    return 1;
  }
  const rank = Math.max(1, toNumber(row.rank, 5));
  const roi = toNumber(row.roi, 0);
  const rankWeight = Math.max(0.6, 1.6 - (rank - 1) * 0.2);
  const roiBonus = Math.max(-0.2, Math.min(0.6, roi / 200));
  const weight = rankWeight + roiBonus;
  return Math.round(Math.max(0.5, Math.min(2.2, weight)) * 100) / 100;
}

function buildVer9AiRanking(limit = 20) {
  const summary = getBestAiSummary(Math.max(5, Number(limit) || 20));
  const leaderboard = Array.isArray(summary?.leaderboard) ? summary.leaderboard : [];

  const roleRanking = Object.values(VER10_ROLE_MAP).map((role) => {
    const mappedRow = findBestRowByAiIds(leaderboard, role.aiIds);
    return {
      roleId: role.roleId,
      roleName: role.roleName,
      mappedAiId: String(mappedRow?.aiId || role.aiIds[0] || ''),
      mappedAiName: String(mappedRow?.aiName || '実績集計中'),
      rank: toNumber(mappedRow?.rank, 99),
      roi: toNumber(mappedRow?.roi, 0),
      profit: Math.round(toNumber(mappedRow?.profit, 0)),
      hitRate: toNumber(mappedRow?.hitRate, 0),
      weight: buildInfluenceWeight(mappedRow)
    };
  });

  return {
    success: true,
    evaluatedAt: new Date().toISOString(),
    leaderboard,
    roleRanking
  };
}

module.exports = {
  VER10_ROLE_MAP,
  buildVer9AiRanking
};
