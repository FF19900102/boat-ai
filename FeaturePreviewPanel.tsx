import { Venue } from '@/lib/types';
import { FeatureMap } from '@/ai/features/pro/types';

export function buildWeatherFeatures(venue?: Venue): FeatureMap {
  const wind = venue?.weather.windSpeed ?? 0;
  const wave = venue?.weather.waveHeight ?? 0;

  return {
    weather_wind_speed: wind,
    weather_wave_height: wave,
    weather_calm: wind <= 2 && wave <= 2,
    weather_rough: wind >= 5 || wave >= 4,
    weather_extreme: wind >= 7 || wave >= 5,
    weather_condition_sunny: venue?.weather.condition === '晴',
    weather_condition_rain: venue?.weather.condition === '雨',
    weather_direction_west: venue?.weather.windDirection === '西',
    weather_direction_north: venue?.weather.windDirection === '北'
  };
}
