export type Venue = { id: string; name: string; night?: boolean }
export type Boat = {
  lane: number
  name: string
  className: string
  nationalWin: number
  localWin: number
  avgST: number
  motorRate: number
  boatRate: number
  exhibition: number
  tilt: number
  weight: number
}
export type RaceContext = {
  venue: string
  raceNo: number
  weather: string
  wind: number
  wave: number
}
export type Prediction = Boat & {
  score: number
  firstRate: number
  top2Rate: number
  top3Rate: number
}
export type Bet = {
  key: string
  first: number
  second: number
  third: number
  probability: number
  odds: number
  ev: number
  judgment: '買い候補' | '注意' | '買わない'
}
export type SavedResult = {
  id: string
  date: string
  venue: string
  raceNo: number
  result: string
  betKey: string
  stake: number
  payout: number
  profit: number
  hit: boolean
}
