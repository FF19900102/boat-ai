import { FeatureMap } from '@/ai/features/pro/types';

export function buildLaneFeatures(lane: number): FeatureMap {
  return {
    lane,
    lane_1: lane === 1,
    lane_2: lane === 2,
    lane_3: lane === 3,
    lane_4: lane === 4,
    lane_5: lane === 5,
    lane_6: lane === 6,
    lane_inner: lane <= 2,
    lane_center: lane === 3 || lane === 4,
    lane_outer: lane >= 5,
    lane_bias_score: ({ 1: 100, 2: 74, 3: 68, 4: 60, 5: 48, 6: 40 } as Record<number, number>)[lane] ?? 40
  };
}
