'use client';
import { Weather } from '@/lib/types';
export default function WeatherForm({weather,onChange}:{weather:Weather,onChange:(w:Weather)=>void}){
 const set=(k:keyof Weather,v:string)=>onChange({...weather,[k]:k==='windSpeed'||k==='wave'?Number(v):v});
 return <div className="formgrid"><div><label>天候</label><select value={weather.weather} onChange={e=>set('weather',e.target.value)}><option>晴</option><option>曇</option><option>雨</option></select></div><div><label>風向</label><input value={weather.windDir} onChange={e=>set('windDir',e.target.value)}/></div><div><label>風速m</label><input type="number" value={weather.windSpeed} onChange={e=>set('windSpeed',e.target.value)}/></div><div><label>波高cm</label><input type="number" value={weather.wave} onChange={e=>set('wave',e.target.value)}/></div></div>
}
