'use client';
import type { RaceWeather } from '@/lib/types';

export function WeatherPanel({ weather, onChange }: { weather: RaceWeather; onChange: (weather: RaceWeather) => void }) {
  return (
    <section className="card">
      <h2>水面・気象</h2>
      <div className="grid grid-2">
        <label>天候<select value={weather.weather} onChange={(e) => onChange({ ...weather, weather: e.target.value })}><option>晴れ</option><option>曇り</option><option>雨</option><option>雪</option></select></label>
        <label>風向<select value={weather.windDirection} onChange={(e) => onChange({ ...weather, windDirection: e.target.value })}><option>向かい風</option><option>追い風</option><option>左横風</option><option>右横風</option><option>無風</option></select></label>
        <label>風速 m<input type="number" value={weather.windSpeed} onChange={(e) => onChange({ ...weather, windSpeed: Number(e.target.value) })} /></label>
        <label>波高 cm<input type="number" value={weather.waveHeight} onChange={(e) => onChange({ ...weather, waveHeight: Number(e.target.value) })} /></label>
      </div>
    </section>
  );
}
