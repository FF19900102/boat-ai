export type Venue = { id: string; name: string; region: string; night?: boolean; note?: string };
export type BoatEntry = { frame:number; player:string; classRank:string; nationalWin:number; localWin:number; avgST:number; motorRate:number; boatRate:number; exhibition:number; tilt:number; weight:number; course:number; oddsWin:number };
export type Weather = { weather:string; windDir:string; windSpeed:number; wave:number };
export type RaceInput = { venueId:string; venueName:string; raceNo:number; date:string; entries:BoatEntry[]; weather:Weather };
export type BoatProbability = BoatEntry & { score:number; first:number; top2:number; top3:number; comment:string };
export type Trifecta = { key:string; first:number; second:number; third:number; probability:number; odds:number; ev:number; judge:string };
export type SavedResult = { id:string; race:RaceInput; trifectas:Trifecta[]; selected:string[]; result:string; payout:number; stake:number; returnAmount:number; profit:number; hit:boolean; createdAt:string };
