export function weatherRisk(weather={}){
  const wind=Number(weather.windSpeed||0);
  const wave=Number(weather.waveHeight||0);
  if(wind>=7 || wave>=8) return '高い：荒れやすい。穴と見送りを重視';
  if(wind>=4 || wave>=5) return '中：展示後の再計算を重視';
  return '低い：通常条件';
}
export function scoreBoat(b,weather={}){
  const wind=Number(weather.windSpeed||0);
  const wave=Number(weather.waveHeight||0);
  const frameBonusBase = {1:18,2:8,3:5,4:1,5:-3,6:-7}[b.frame] ?? 0;
  const roughPenalty = (wind>=5 || wave>=5) && b.frame===1 ? -4 : 0;
  const outsideBonus = (wind>=6 || wave>=7) && b.frame>=4 ? 2 : 0;
  const stScore = Math.max(0, (0.23 - Number(b.avgST)) * 120);
  const exhibitionScore = Math.max(0, (6.95 - Number(b.exhibition)) * 28);
  const weightScore = Math.max(-2, Math.min(2, (53 - Number(b.weight||53))*0.4));
  return Math.max(1,
    Number(b.nationalWin)*8 +
    Number(b.localWin)*5 +
    Number(b.motorRate)*0.55 +
    Number(b.boatRate)*0.25 +
    stScore + exhibitionScore + weightScore + frameBonusBase + roughPenalty + outsideBonus
  );
}
export function probabilities(boats,weather={}){
  const rows = boats.map(b=>({...b, score: scoreBoat(b,weather)}));
  const total = rows.reduce((a,b)=>a+b.score,0) || 1;
  return rows.map(b=>({
    ...b,
    firstProb: b.score/total,
    top2Prob: Math.min(0.95, b.score/total*1.85),
    top3Prob: Math.min(0.98, b.score/total*2.65)
  })).sort((a,b)=>b.firstProb-a.firstProb);
}
export function trifectaRankings(boats, oddsMap={}, weather={}){
  const probs = probabilities(boats,weather);
  const byFrame = Object.fromEntries(probs.map(b=>[b.frame,b]));
  const tickets=[];
  for(const a of boats){ for(const b of boats){ for(const c of boats){
    if(a.frame===b.frame || a.frame===c.frame || b.frame===c.frame) continue;
    const pa=byFrame[a.frame].firstProb;
    const pb=byFrame[b.frame].top2Prob/(1-pa*0.35);
    const pc=byFrame[c.frame].top3Prob/(1-pa*0.25-pb*0.15);
    const roughBoost = Number(weather.windSpeed||0)>=6 && a.frame!==1 ? 1.08 : 1;
    const hitProb=Math.max(0.0001, pa*pb*pc*0.42*roughBoost);
    const key=`${a.frame}-${b.frame}-${c.frame}`;
    const odds=Number(oddsMap[key] || autoOdds(hitProb));
    const ev=hitProb*odds*100;
    tickets.push({key,hitProb,odds,ev,rank: judgeEv(ev)});
  }}}
  return tickets.sort((a,b)=>b.ev-a.ev).slice(0,40);
}
function autoOdds(p){ return Math.max(4, Math.min(250, +(0.82/p/100).toFixed(1))); }
function judgeEv(ev){ if(ev>=120) return '買い候補'; if(ev>=100) return '注意'; return '見送り'; }
export function aiComment(top,weather={}){
  if(!top) return 'データ待ち';
  const risk=weatherRisk(weather);
  if(top.ev>=140) return `期待値が高い買い目があります。${risk}`;
  if(top.ev>=110) return `妙味はありますが、点数は絞ってください。${risk}`;
  return `強い買い目がないため見送り寄りです。${risk}`;
}
