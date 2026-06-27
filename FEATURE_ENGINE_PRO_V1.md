import { OddsMap } from '@/lib/types';
import { FeatureMap } from '@/ai/features/pro/types';

export function buildOddsFeatures(odds: OddsMap, lane: number): FeatureMap {
  const related = Object.entries(odds)
    .filter(([key]) => key.startsWith(`${lane}-`))
    .map(([, value]) => value);

  const min = related.length ? Math.min(...related) : 0;
  const avg = related.length ? related.reduce((s, v) => s + v, 0) / related.length : 0;

  return {
    odds_first_min: min,
    odds_first_avg: Number(avg.toFixed(2)),
    odds_first_low: min > 0 && min <= 12,
    odds_first_high: min >= 60,
    odds_related_count: related.length
  };
}
