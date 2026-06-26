export type Racer = { frame:number; name:string; className:string; nationalWin:number; localWin:number; avgSt:number; motorRate:number; boatRate:number; exhibition:number; tilt:number; weight:number; odds:number };
export type Weather = { wind:number; wave:number; direction:string };
export type Prediction = Racer & { score:number; winProb:number; top2:number; top3:number };
export type Ticket = { combo:string; prob:number; odds:number; ev:number; label:string };

export const venues = ['桐生','戸田','江戸川','平和島','多摩川','浜名湖','蒲郡','常滑','津','三国','びわこ','住之江','尼崎','鳴門','丸亀','児島','宮島','徳山','下関','若松','芦屋','福岡','唐津','大村'];

export const defaultRacers = (): Racer[] => Array.from({length:6},(_,i)=>({
  frame:i+1,name:`選手${i+1}`,className:i<2?'A1':i<4?'A2':'B1',nationalWin: [6.8,5.9,5.4,4.9,4.5,4.1][i],localWin:[6.5,5.6,5.1,4.8,4.2,3.8][i],avgSt:[0.14,0.16,0.15,0.17,0.18,0.19][i],motorRate:[42,36,33,29,27,24][i],boatRate:[38,35,31,30,25,22][i],exhibition:[6.72,6.76,6.74,6.79,6.81,6.84][i],tilt:0,weight:[52,53,52,54,55,56][i],odds:[2.1,6.8,9.4,18.2,31.5,58.0][i]
}));

const frameBonus = (f:number)=>({1:18,2:7,3:4,4:1,5:-4,6:-8} as Record<number,number>)[f] ?? 0;

export function predict(racers:Racer[], weather:Weather): Prediction[] {
  const raw = racers.map(r=>{
    const exhibitionScore = Math.max(0, (6.9 - r.exhibition) * 80);
    const stScore = Math.max(0, (0.24 - r.avgSt) * 120);
    const windPenalty = weather.wind >= 5 && r.frame === 1 ? -5 : 0;
    const wavePenalty = weather.wave >= 5 && r.frame >= 5 ? -3 : 0;
    const score = r.nationalWin*7 + r.localWin*4 + r.motorRate*.38 + r.boatRate*.22 + exhibitionScore + stScore + frameBonus(r.frame) + windPenalty + wavePenalty;
    return {...r, score: Math.max(1, score)};
  });
  const total = raw.reduce((s,r)=>s+r.score,0);
  return raw.map(r=>{
    const winProb = r.score/total;
    return {...r, winProb, top2: Math.min(.96, winProb*1.75), top3: Math.min(.99, winProb*2.35)};
  }).sort((a,b)=>b.winProb-a.winProb);
}

export function makeTickets(predictions:Prediction[]): Ticket[] {
  const byFrame = [...predictions].sort((a,b)=>a.frame-b.frame);
  const tickets: Ticket[] = [];
  for(const a of byFrame) for(const b of byFrame) for(const c of byFrame){
    if(a.frame===b.frame || a.frame===c.frame || b.frame===c.frame) continue;
    const prob = a.winProb * (b.top2/(1-a.winProb)) * (c.top3/(1-a.winProb-b.winProb*.5));
    const odds = Math.max(1.1, (a.odds*0.8 + b.odds*0.35 + c.odds*0.18));
    const ev = prob * odds * 100;
    tickets.push({combo:`${a.frame}-${b.frame}-${c.frame}`, prob:Math.max(0,prob), odds:Number(odds.toFixed(1)), ev:Number(ev.toFixed(1)), label: ev>=120?'買い候補':ev>=100?'注意':'見送り'});
  }
  return tickets.sort((x,y)=>y.ev-x.ev).slice(0,20);
}

export function grade(ev:number){ if(ev>=140) return '★★★★★'; if(ev>=120) return '★★★★'; if(ev>=100) return '★★★'; if(ev>=80) return '★★'; return '★'; }
