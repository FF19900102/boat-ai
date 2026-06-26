'use client';
import { Boat } from '@/lib/types';
export default function BoatForm({boats,onChange}:{boats:Boat[],onChange:(boats:Boat[])=>void}){
 const set=(idx:number,key:keyof Boat,val:string)=>{const next=[...boats];(next[idx] as any)[key]=key==='name'||key==='classRank'?val:Number(val);onChange(next)};
 return <div>{boats.map((b,i)=><div className="boatRow" key={b.frame}>
  <div><label>枠</label><div className="stat">{b.frame}</div></div>
  <div><label>選手</label><input value={b.name} onChange={e=>set(i,'name',e.target.value)}/></div>
  <div><label>級</label><input value={b.classRank} onChange={e=>set(i,'classRank',e.target.value)}/></div>
  <div><label>全国</label><input type="number" step="0.01" value={b.nationalRate} onChange={e=>set(i,'nationalRate',e.target.value)}/></div>
  <div><label>当地</label><input type="number" step="0.01" value={b.localRate} onChange={e=>set(i,'localRate',e.target.value)}/></div>
  <div><label>ST</label><input type="number" step="0.01" value={b.avgST} onChange={e=>set(i,'avgST',e.target.value)}/></div>
  <div><label>モーター%</label><input type="number" step="0.1" value={b.motorRate} onChange={e=>set(i,'motorRate',e.target.value)}/></div>
  <div><label>展示</label><input type="number" step="0.01" value={b.exhibition} onChange={e=>set(i,'exhibition',e.target.value)}/></div>
  <div><label>体重</label><input type="number" step="0.1" value={b.weight} onChange={e=>set(i,'weight',e.target.value)}/></div>
 </div>)}</div>
}
