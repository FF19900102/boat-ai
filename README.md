export type Venue = {
  id: string;
  name: string;
  region: string;
  water: string;
  today: boolean;
};

export type BoatEntry = {
  lane: number;
  racerName: string;
  className: string;
  nationalWinRate: number;
  localWinRate: number;
  avgST: number;
  motor2Rate: number;
  boat2Rate: number;
  exhibitionTime: number;
  tilt: number;
  weight: number;
  course: number;
};

export type Weather = {
  weather: string;
  windDirection: string;
  windSpeed: number;
  waveHeight: number;
};

export type RaceInput = {
  id: string;
  date: string;
  venueId: string;
  venueName: string;
  raceNo: number;
  entries: BoatEntry[];
  weather: Weather;
  odds: Record<string, number>;
};

export type BoatProbability = BoatEntry & {
  score: number;
  firstRate: number;
  top2Rate: number;
  top3Rate: number;
  rank: number;
};

export type TrifectaPick = {
  key: string;
  first: number;
  second: number;
  third: number;
  probability: number;
  odds: number;
  ev: number;
  decision: "買い候補" | "注意" | "買わない";
};

export type RaceResult = {
  raceId: string;
  resultKey: string;
  payout: number;
  stake: number;
  bought: { key: string; amount: number }[];
  hit: boolean;
  returnAmount: number;
  profit: number;
  savedAt: string;
};

export type SavedRace = RaceInput & {
  createdAt: string;
  result?: RaceResult;
};
