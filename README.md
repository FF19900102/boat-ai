export type Venue = {
  id: string;
  name: string;
  region: string;
  night?: boolean;
};

export type Racer = {
  lane: number;
  name: string;
  className: string;
  nationalWinRate: number;
  localWinRate: number;
  avgStart: number;
  motorRate: number;
  boatRate: number;
  exhibitionTime: number;
  tilt: number;
  weight: number;
  oddsWin: number;
};

export type RaceWeather = {
  weather: string;
  windDirection: string;
  windSpeed: number;
  waveHeight: number;
};

export type Ticket = {
  combination: string;
  probability: number;
  odds: number;
  ev: number;
  rank: 'BUY' | 'WATCH' | 'SKIP';
  oddsSource?: 'manual' | 'estimated';
};

export type SavedRace = {
  id: string;
  date: string;
  venue: string;
  raceNo: number;
  racers: Racer[];
  weather: RaceWeather;
  tickets: Ticket[];
  result?: {
    first: number;
    second: number;
    third: number;
    payout: number;
    betAmount: number;
    hit: boolean;
    profit: number;
  };
};
