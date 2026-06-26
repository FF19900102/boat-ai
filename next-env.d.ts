export type Boat = { frame:number; name:string; className:string; nationalWin:number; localWin:number; avgST:number; motorRate:number; boatRate:number; exhibition:number; tilt:number; weight:number; course:number; score?:number; p1?:number; p2?:number; p3?:number };
export type RaceInfo = { date:string; venue:string; raceNo:number; weather:string; windDir:string; windSpeed:number; wave:number };
export type SavedRace = { id:string; race:RaceInfo; boats:Boat[]; createdAt:string };
