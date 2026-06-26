'use client';
import { Weather } from '@/lib/types';

export function WeatherPanel({ weather, onChange }: { weather: Weather; onChange: (w: Weather) => void }) {
  const set = (key: keyof Weather, value: string) => onChange({ ...weather, [key]: key === 'windSpeed' || key === 'wave' ? Number(value) : value });
  return (
    <div className="card">
      <div className="section-title" style={{ marginTop: 0 }}>気象</div>
      <div className="row">
        <div style={{ flex: 1 }}><label>天候</label><select value={weather.condition} onChange={(e) => set('condition', e.target.value)}><option>晴</option><option>曇</option><option>雨</option></select></div>
        <div style={{ flex: 1 }}><label>風向</label><select value={weather.windDirection} onChange={(e) => set('windDirection', e.target.value)}><option>向かい風</option><option>追い風</option><option>右横風</option><option>左横風</option><option>無風</option></select></div>
        <div style={{ flex: 1 }}><label>風速m</label><input type="number" value={weather.windSpeed} onChange={(e) => set('windSpeed', e.target.value)} /></div>
        <div style={{ flex: 1 }}><label>波cm</label><input type="number" value={weather.wave} onChange={(e) => set('wave', e.target.value)} /></div>
      </div>
    </div>
  );
}
