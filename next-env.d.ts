import { SavedRace } from './types';
const KEY='boat-ai-races-v1';
export function loadRaces():SavedRace[]{if(typeof window==='undefined')return[];try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}}
export function saveRace(r:SavedRace){const all=loadRaces().filter(x=>x.id!==r.id);all.unshift(r);localStorage.setItem(KEY,JSON.stringify(all.slice(0,500)));}
export function clearRaces(){localStorage.removeItem(KEY)}
