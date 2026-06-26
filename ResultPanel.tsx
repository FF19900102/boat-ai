'use client';
import { Weather } from '@/lib/types';
export default function WeatherForm({weather,setWeather}:{weather:Weather;setWeather:(w:Weather)=>void}){
 const set=(k:keyof Weather,v:string)=>setWeather({...weather,[k]:k==='windSpeed'||k==='wave'?Number(v):v});
 return <div className="grid grid4"><label><span className="label">天候</span><select className="input" value={weather.condition} onChange={e=>set('condition',e.target.value)}><option>晴</option><option>曇</option><option>雨</option></select></label><label><span className="label">風向</span><input className="input" value={weather.windDirection} onChange={e=>set('windDirection',e.target.value)} /></label><label><span className="label">風速 m</span><input className="input" type="number" value={weather.windSpeed} onChange={e=>set('windSpeed',e.target.value)} /></label><label><span className="label">波高 cm</span><input className="input" type="number" value={weather.wave} onChange={e=>set('wave',e.target.value)} /></label></div>
}
