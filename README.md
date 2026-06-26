import {Race, Racer} from '@/types/boat';

export type ValidationIssue = { field:string; message:string; level:'warn'|'error' };

export function validateRacer(r:Racer):ValidationIssue[]{
  const issues:ValidationIssue[]=[];
  if(!r.name) issues.push({field:'name',message:'選手名が空です',level:'error'});
  if(r.nationalWin<0 || r.nationalWin>10) issues.push({field:'nationalWin',message:'全国勝率が範囲外です',level:'warn'});
  if(r.avgSt<0.05 || r.avgSt>0.35) issues.push({field:'avgSt',message:'平均STが通常範囲外です',level:'warn'});
  if(r.exhibition<6.3 || r.exhibition>7.3) issues.push({field:'exhibition',message:'展示タイムが通常範囲外です',level:'warn'});
  return issues;
}

export function validateRace(race:Race):ValidationIssue[]{
  const issues:ValidationIssue[]=[];
  if(race.racers.length!==6) issues.push({field:'racers',message:'6艇分の出走表が必要です',level:'error'});
  race.racers.forEach(r=>issues.push(...validateRacer(r).map(i=>({...i,field:`${r.lane}号艇.${i.field}`}))));
  return issues;
}

export function dataCompleteness(race:Race){
  const fields=['name','className','nationalWin','localWin','avgSt','motorRate','boatRate','exhibition','tilt','weight'] as const;
  const total=race.racers.length*fields.length;
  let filled=0;
  race.racers.forEach(r=>fields.forEach(f=>{ if((r as any)[f]!==undefined && (r as any)[f]!==null && (r as any)[f]!== '') filled++; }));
  return Math.round(filled/total*100);
}
