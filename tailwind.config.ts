export type Venue = {
  id: string;
  name: string;
  area: string;
  today: boolean;
};

export type Racer = {
  lane: number;
  name: string;
  className: string;
  nationalRate: number;
  localRate: number;
  avgST: number;
  motorRate: number;
  boatRate: number;
  exhibition: number;
  tilt: number;
  weight: number;
};

export type Race = {
  venueId: string;
  raceNo: number;
  title: string;
  deadline: string;
  wind: number;
  wave: number;
  racers: Racer[];
};

export type Prediction = Racer & {
  score: number;
  winRate: number;
  top2Rate: number;
  top3Rate: number;
};

export type TrifectaPick = {
  key: string;
  probability: number;
  odds: number;
  ev: number;
  rank: number;
};
