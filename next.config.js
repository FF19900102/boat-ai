export type Venue = { id: string; name: string; area: string; night?: boolean };
export type Boat = {
  frame: number;
  racer: string;
  className: string;
  nationalRate: number;
  localRate: number;
  avgSt: number;
  motorRate: number;
  boatRate: number;
  exhibition: number;
  tilt: number;
  weight: number;
  oddsWin: number;
};
export type Weather = { weather: string; windDirection: string; windSpeed: number; wave: number };
export type Prediction = { frame: number; racer: string; score: number; win: number; top2: number; top3: number };
export type Trifecta = { combo: string; probability: number; odds: number; ev: number; decision: '買い候補' | '注意' | '買わない' };
export type ResultRecord = { id: string; date: string; venue: string; raceNo: number; result: string; bought: string; stake: number; payout: number; hit: boolean; profit: number; createdAt: string };
