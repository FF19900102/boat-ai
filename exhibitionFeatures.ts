import { Race, Venue } from '@/lib/types';
import { FeatureRow } from '@/ai/features/pro/types';
import { buildRacerFeatures } from '@/ai/features/pro/groups/racerFeatures';
import { buildMotorFeatures } from '@/ai/features/pro/groups/motorFeatures';
import { buildExhibitionFeatures } from '@/ai/features/pro/groups/exhibitionFeatures';
import { buildLaneFeatures } from '@/ai/features/pro/groups/laneFeatures';
import { buildWeatherFeatures } from '@/ai/features/pro/groups/weatherFeatures';
import { buildOddsFeatures } from '@/ai/features/pro/groups/oddsFeatures';

export function buildProFeatureRows(race: Race, venue?: Venue): FeatureRow[] {
  return race.entries.map((entry) => ({
    raceId: race.id,
    lane: entry.lane,
    features: {
      race_no: race.raceNo,
      race_status_finished: race.status === 'finished',
      ...buildLaneFeatures(entry.lane),
      ...buildRacerFeatures(entry),
      ...buildMotorFeatures(entry),
      ...buildExhibitionFeatures(entry),
      ...buildWeatherFeatures(venue),
      ...buildOddsFeatures(race.odds, entry.lane)
    }
  }));
}

export function flattenFeatureRow(row: FeatureRow) {
  return {
    raceId: row.raceId,
    lane: row.lane,
    ...row.features
  };
}
