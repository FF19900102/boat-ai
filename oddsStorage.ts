import type { Race } from '@/lib/types';

export function WeatherPanel({ race }: { race: Race }) {
  return (
    <section className="grid grid-4">
      <div className="card kpi"><span>天候</span><strong>{race.weather.weather}</strong></div>
      <div className="card kpi"><span>風向/風速</span><strong>{race.weather.windDirection} {race.weather.windSpeed}m</strong></div>
      <div className="card kpi"><span>波高</span><strong>{race.weather.waveHeight}cm</strong></div>
      <div className="card kpi"><span>水面判定</span><strong>{race.weather.windSpeed >= 5 || race.weather.waveHeight >= 4 ? '荒れ注意' : '標準'}</strong></div>
    </section>
  );
}
