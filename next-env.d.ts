import {Racer} from './data';
export type Prediction={lane:number;name:string;score:number;win:number;top2:number;top3:number};
export type Ticket={key:string;prob:number;odds:number;ev:number;judge:string};
const laneBonus=(l:number)=>({1:1.18,2:1.04,3:1,4:.94,5:.86,6:.78} as any)[l]||1;
export function predict(racers:Racer[]):Prediction[]{const raw=racers.map(r=>{const s=(r.national*18)+(r.local*9)+(r.motor*.75)+(r.boat*.35)+((0.25-r.st)*160)+((6.95-r.exhibition)*90)+(r.className==='A1'?8:r.className==='A2'?3:0);return {...r,score:Math.max(1,s*laneBonus(r.lane))}});const sum=raw.reduce((a,b)=>a+b.score,0);return raw.map(r=>({lane:r.lane,name:r.name,score:Math.round(r.score),win:round(r.score/sum*100),top2:round(Math.min(92,r.score/sum*165)),top3:round(Math.min(98,r.score/sum*230))})).sort((a,b)=>b.win-a.win)}
export function makeTickets(preds:Prediction[]):Ticket[]{const byLane=new Map(preds.map(p=>[p.lane,p]));const tickets:Ticket[]=[];for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)for(let c=1;c<=6;c++){if(a===b||a===c||b===c)continue;const pa=byLane.get(a)!,pb=byLane.get(b)!,pc=byLane.get(c)!;const prob=(pa.win/100)*(pb.top2/100)*(pc.top3/100)*100*.72;const odds=mockOdds(a,b,c,prob);const ev=prob*odds; tickets.push({key:`${a}-${b}-${c}`,prob:round(prob),odds:round(odds),ev:round(ev),judge:ev>=120?'買い候補':ev>=100?'注意':'見送り'});}return tickets.sort((a,b)=>b.ev-a.ev).slice(0,30)}
function mockOdds(a:number,b:number,c:number,prob:number){return Math.max(3, (100/Math.max(prob,.2))*(.68+((a*7+b*3+c)%9)/20));}
function round(n:number){return Math.round(n*10)/10}
