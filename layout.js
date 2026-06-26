export function calcBoatScore(b){
  const frameBonus = {1:1.28,2:1.08,3:1.02,4:0.95,5:0.86,6:0.76}[b.frame] || 1;
  const gradeBonus = {A1:1.18,A2:1.06,B1:0.96,B2:0.86}[b.grade] || 1;
  const stScore = Math.max(0, (0.25 - Number(b.st || 0.18)) * 90);
  const exhibitScore = Math.max(0, (6.9 - Number(b.exhibition || 6.8)) * 22);
  const base =
    Number(b.national || 0) * 8 +
    Number(b.local || 0) * 5 +
    Number(b.motor || 0) * 0.55 +
    Number(b.boat || 0) * 0.25 +
    stScore + exhibitScore;
  return Math.max(1, base * frameBonus * gradeBonus);
}

export function probabilities(racers){
  const scores = racers.map(calcBoatScore);
  const total = scores.reduce((a,b)=>a+b,0);
  return racers.map((r,i)=>{
    const win = scores[i] / total;
    return {
      ...r,
      score: Number(scores[i].toFixed(1)),
      winProb: win,
      top2Prob: Math.min(0.92, win * 1.75),
      top3Prob: Math.min(0.98, win * 2.45)
    };
  }).sort((a,b)=>b.winProb-a.winProb);
}

export function trifecta(ranked){
  const arr=[];
  const boats=[...ranked];
  for(const a of boats){
    for(const b of boats){
      if(b.frame===a.frame) continue;
      for(const c of boats){
        if(c.frame===a.frame || c.frame===b.frame) continue;
        const p = a.winProb * (b.top2Prob/(1-a.winProb)) * (c.top3Prob/(1-a.winProb-b.winProb/2));
        const prob = Math.max(0.0005, Math.min(0.25, p));
        const odds = Number((6 + (1/prob)*0.38 + Math.abs(a.frame-c.frame)*1.5).toFixed(1));
        const ev = prob * odds * 100;
        arr.push({bet:`${a.frame}-${b.frame}-${c.frame}`,prob,odds,ev});
      }
    }
  }
  return arr.sort((x,y)=>y.ev-x.ev).slice(0,20);
}

export function judge(list){
  const top=list[0];
  if(!top) return {label:'見送り',className:'skip',text:'買い候補なし'};
  if(top.ev>=120) return {label:'購入候補',className:'buy',text:`期待値 ${top.ev.toFixed(0)}`};
  if(top.ev>=100) return {label:'注意',className:'',text:`期待値 ${top.ev.toFixed(0)}。無理に買わない`};
  return {label:'見送り',className:'skip',text:'期待値不足'};
}
