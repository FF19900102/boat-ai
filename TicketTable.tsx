'use client';
import { Racer } from '@/lib/types';
const fields: (keyof Racer)[] = ['name','className','nationalWin','localWin','avgSt','motor2','boat2','exhibition','tilt','weight','entry'];
const labels: Record<string,string> = {name:'選手名',className:'級',nationalWin:'全国勝率',localWin:'当地勝率',avgSt:'平均ST',motor2:'M2連率',boat2:'B2連率',exhibition:'展示',tilt:'チルト',weight:'体重',entry:'進入'};
export default function RacerTable({racers,setRacers}:{racers:Racer[];setRacers:(r:Racer[])=>void}){
 const update=(i:number,k:keyof Racer,v:string)=>{const next=[...racers]; const old=next[i]; (next[i] as any)={...old,[k]: k==='name'||k==='className'?v:Number(v)}; setRacers(next)};
 return <div className="scroll"><table className="table"><thead><tr><th>枠</th>{fields.map(f=><th key={f}>{labels[f]}</th>)}</tr></thead><tbody>{racers.map((r,i)=><tr key={r.lane}><td><b>{r.lane}</b></td>{fields.map(f=><td key={f}><input className="input" value={(r as any)[f]} onChange={e=>update(i,f,e.target.value)} /></td>)}</tr>)}</tbody></table></div>
}
