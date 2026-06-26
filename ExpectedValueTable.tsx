"use client";
import { Weather } from "@/lib/types";

export function WeatherForm({ weather, onChange }: { weather: Weather; onChange: (w: Weather) => void }) {
  const set = (key: keyof Weather, value: string) => onChange({ ...weather, [key]: key === "weather" || key === "windDirection" ? value : Number(value) });
  return (
    <div className="grid gap-3 md:grid-cols-4">
      <div><div className="label">天候</div><input className="input" value={weather.weather} onChange={(e)=>set("weather", e.target.value)} /></div>
      <div><div className="label">風向</div><input className="input" value={weather.windDirection} onChange={(e)=>set("windDirection", e.target.value)} /></div>
      <div><div className="label">風速 m</div><input className="input" type="number" value={weather.windSpeed} onChange={(e)=>set("windSpeed", e.target.value)} /></div>
      <div><div className="label">波高 cm</div><input className="input" type="number" value={weather.waveHeight} onChange={(e)=>set("waveHeight", e.target.value)} /></div>
    </div>
  );
}
