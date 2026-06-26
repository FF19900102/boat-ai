export type Venue = { id: string; name: string; area: string; status: '開催' | 'ナイター' | 'モーニング' };
export type Racer = {
  lane: number; name: string; className: string; nationalWin: number; localWin: number; st: number;
  motorRate: number; boatRate: number; exhibition: number; tilt: number; weight: number; entry: number;
};
export type Weather = { weather: string; windDir: string; windSpeed: number; wave: number };
export type Trifecta = { key: string; lanes: number[]; probability: number; odds: number; ev: number; label: string };
export type SavedRace = {
  id: string; date: string; venue: string; raceNo: number; racers: Racer[]; weather: Weather;
  trifectas: Trifecta[]; bought: string[]; stake: number; result: string; payout: number; hit: boolean; profit: number;
};
