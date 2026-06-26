import { SavedRace } from "./types";
const KEY = "boat-ai-saved-races-v15";
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
