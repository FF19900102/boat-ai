import { SavedRace } from './types';
const KEY = 'boat-ai-saved-races-v1';
export function loadRaces(): SavedRace[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
export function saveRace(race: SavedRace) {
  if (typeof window === 'undefined') return;
  const all = loadRaces().filter((r)=>r.id !== race.id);
  localStorage.setItem(KEY, JSON.stringify([race, ...all].slice(0, 500)));
}
export function clearRaces() { if (typeof window !== 'undefined') localStorage.removeItem(KEY); }
export function summary(races: SavedRace[]) {
  const finished = races.filter(r=>r.result);
  const stake = finished.reduce((s,r)=>s+(r.result?.stake||0),0);
  const payout = finished.reduce((s,r)=>s+((r.result?.hit?r.result?.payout:0)||0),0);
  const hit = finished.filter(r=>r.result?.hit).length;
  return { races: races.length, finished: finished.length, stake, payout, profit: payout-stake, hitRate: finished.length?hit/finished.length:0, returnRate: stake?payout/stake:0 };
}
