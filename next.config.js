export type Venue = {
  id: string;
  name: string;
  area: string;
  isOpenToday: boolean;
};

export type Racer = {
  lane: number;
  name: string;
  className: string;
  nationalWinRate: number;
  localWinRate: number;
  avgST: number;
  motorRate: number;
  boatRate: number;
  exhibitionTime: number;
  weight: number;
};

export type Prediction = {
  lane: number;
  name: string;
  score: number;
  firstRate: number;
  top2Rate: number;
  top3Rate: number;
};
