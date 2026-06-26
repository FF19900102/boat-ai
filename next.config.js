export type Venue = {
  id: string;
  name: string;
  region: string;
  night?: boolean;
};

export type Boat = {
  frame: number;
  name: string;
  className: string;
  nationalWin: number;
  localWin: number;
  avgST: number;
  motorRate: number;
  boatRate: number;
  exhibition: number;
  tilt: number;
  weight: number;
  course: number;
};

export type Weather = {
  condition: string;
  windDirection: string;
  windSpeed: number;
  wave: number;
};

export type Ticket = {
  combo: string;
  probability: number;
  odds: number;
  ev: number;
  label: string;
};

export type SavedRace = {
  id: string;
  venue: string;
  raceNo: number;
  date: string;
  boats: Boat[];
  weather: Weather;
  tickets: Ticket[];
  result?: string;
  payout?: number;
  stake?: number;
  profit?: number;
};
