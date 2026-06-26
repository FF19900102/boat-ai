export type Racer={lane:number;name:string;className:string;nationalWin:number;localWin:number;avgST:number;motorRate:number;boatRate:number;exhibition:number;tilt:number;weight:number;course:number}
export type RaceMeta={date:string;venue:string;raceNo:number;weather:string;windDir:string;windSpeed:number;wave:number}
export type Bet={key:string;prob:number;odds:number;ev:number;judge:string}
export type SavedRace={id:string;meta:RaceMeta;racers:Racer[];bets:Bet[];result?:RaceResult;createdAt:string}
export type RaceResult={order:string;payout:number;stake:number;hit:boolean;profit:number}
