export type Boat = {
  frame: number;
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

export type Prediction = Boat & {
  score: number;
  winProb: number;
  top2Prob: number;
  top3Prob: number;
};

export type Exacta3 = {
  key: string;
  probability: number;
  odds: number;
  ev: number;
  decision: '買い候補' | '注意' | '見送り';
};
