export type Venue={id:string;name:string;area:string;condition:string;wind:number;wave:number;status:'開催中'|'発売前'|'終了'};
export type Racer={boat:number;name:string;className:string;nationalWin:number;localWin:number;motorRate:number;boatRate:number;avgStart:number;exhibition:number;tilt:number;weight:number;entry:number};
export type Race={venueId:string;raceNo:number;title:string;deadline:string;weather:string;wind:number;wave:number;racers:Racer[]};
export type Prediction={boat:number;name:string;score:number;firstProb:number;top2Prob:number;top3Prob:number};
export type Trifecta={ticket:string;prob:number;odds:number;ev:number;judge:string};

export type BetRecord={ticket:string;amount:number};
export type RaceResult={id:string;venueId:string;raceNo:number;date:string;resultTicket:string;payoutPer100:number;bets:BetRecord[];investment:number;payout:number;profit:number;isHit:boolean};
