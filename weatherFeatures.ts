import { Entry } from '@/lib/types';
import { FeatureMap } from '@/ai/features/pro/types';

export function buildRacerFeatures(entry: Entry): FeatureMap {
  return {
    racer_class_A1: entry.className === 'A1',
    racer_class_A2: entry.className === 'A2',
    racer_class_B1: entry.className === 'B1',
    racer_national_win_rate: entry.nationalWinRate,
    racer_local_win_rate: entry.localWinRate,
    racer_local_minus_national: entry.localWinRate - entry.nationalWinRate,
    racer_avg_start: entry.avgStart,
    racer_start_score: Math.max(0, 0.25 - entry.avgStart) * 100,
    racer_weight: entry.weight,
    racer_weight_penalty: entry.weight > 54 ? entry.weight - 54 : 0
  };
}
