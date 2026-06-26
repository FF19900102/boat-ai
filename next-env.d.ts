import { SavedRace } from "./types";
const KEY = "boat-ai-saved-races-v16";
export function loadSavedRaces(): SavedRace[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
export function saveRace(race: SavedRace) {
  const list = loadSavedRaces();
  const next = [race, ...list.filter((r) => r.id !== race.id)].slice(0, 500);
  localStorage.setItem(KEY, JSON.stringify(next));
}
export function clearRaces() { localStorage.removeItem(KEY); }

export function replaceSavedRaces(races: SavedRace[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(races.slice(0, 1000)));
}
export function exportSavedRaces() {
  return JSON.stringify(loadSavedRaces(), null, 2);
}
