import { AiWeights } from '@/lib/types';

export type AiModelProfile = {
  id: string;
  name: string;
  description: string;
  weights: AiWeights;
  riskMode: 'safe' | 'balanced' | 'aggressive';
};

export const aiModelProfiles: AiModelProfile[] = [
  {
    id: 'balanced',
    name: '総合AI',
    description: '勝率・モーター・展示・枠番をバランス良く評価',
    riskMode: 'balanced',
    weights: {
      nationalWinRate: 8,
      localWinRate: 5,
      motorRate: 0.55,
      boatRate: 0.25,
      avgStart: 130,
      exhibitionTime: 55,
      laneBias: 1,
      weatherBias: 1
    }
  },
  {
    id: 'motor',
    name: 'モーターAI',
    description: 'モーター2連率とボートを強く評価',
    riskMode: 'balanced',
    weights: {
      nationalWinRate: 6,
      localWinRate: 4,
      motorRate: 1.1,
      boatRate: 0.6,
      avgStart: 100,
      exhibitionTime: 45,
      laneBias: 0.9,
      weatherBias: 1
    }
  },
  {
    id: 'exhibition',
    name: '展示AI',
    description: '展示タイムとSTを重視',
    riskMode: 'safe',
    weights: {
      nationalWinRate: 6,
      localWinRate: 4,
      motorRate: 0.5,
      boatRate: 0.25,
      avgStart: 180,
      exhibitionTime: 120,
      laneBias: 1,
      weatherBias: 1
    }
  },
  {
    id: 'value',
    name: '期待値AI',
    description: '荒れ・オッズ妙味・気象変化を重視',
    riskMode: 'aggressive',
    weights: {
      nationalWinRate: 5,
      localWinRate: 3,
      motorRate: 0.75,
      boatRate: 0.35,
      avgStart: 120,
      exhibitionTime: 70,
      laneBias: 0.7,
      weatherBias: 1.5
    }
  }
];

export function getAiModelProfile(id?: string) {
  return aiModelProfiles.find((m) => m.id === id) ?? aiModelProfiles[0];
}
