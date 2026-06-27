import { Entry } from '@/lib/types';
import { FeatureMap } from '@/ai/features/pro/types';

export function buildExhibitionFeatures(entry: Entry): FeatureMap {
  return {
    exhibition_time: entry.exhibitionTime,
    exhibition_score: Math.max(0, 6.95 - entry.exhibitionTime) * 100,
    exhibition_fast: entry.exhibitionTime <= 6.75,
    exhibition_slow: entry.exhibitionTime >= 6.9,
    tilt: entry.tilt,
    tilt_positive: entry.tilt > 0
  };
}
