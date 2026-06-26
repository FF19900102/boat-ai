'use client';
import { Boat } from '../lib/types';

export default function BoatTable({boats,setBoats}:{boats:Boat[];setBoats:(b:Boat[])=>void}){
  const update=(i:number,key:keyof Boat,value:string)=>{
    const next=[...boats];
    (next[i] as any)[key]=['name','className'].includes(key as string)?value:Number(value);
    setBoats(next);
  };
  return <div className="card" style={{overflowX:'auto'}}>
    <div className="row" style={{justifyContent:'space-between',marginBottom:10}}>
      <h2 style={{margin:0}}>出走表入力</h2><span className="small">今は手入力。後で自動取得に差し替え</span>
    </div>
    <table className="table"><thead><tr><th>枠</th><th>選手</th><th>級</th><th>全国</th><th>当地</th><th>ST</th><th>モーター</th><th>ボート</th><th>展示</th><th>チルト</th><th>体重</th></tr></thead>
    <tbody>{boats.map((b,i)=><tr key={b.frame}>
      <td>{b.frame}</td>
      <td><input className="input" value={b.name} onChange={e=>update(i,'name',e.target.value)}/></td>
      <td><input className="input" value={b.className} onChange={e=>update(i,'className',e.target.value)}/></td>
      <td><input className="input" type="number" step="0.01" value={b.nationalRate} onChange={e=>update(i,'nationalRate',e.target.value)}/></td>
      <td><input className="input" type="number" step="0.01" value={b.localRate} onChange={e=>update(i,'localRate',e.target.value)}/></td>
      <td><input className="input" type="number" step="0.01" value={b.avgST} onChange={e=>update(i,'avgST',e.target.value)}/></td>
      <td><input className="input" type="number" step="0.1" value={b.motorRate} onChange={e=>update(i,'motorRate',e.target.value)}/></td>
      <td><input className="input" type="number" step="0.1" value={b.boatRate} onChange={e=>update(i,'boatRate',e.target.value)}/></td>
      <td><input className="input" type="number" step="0.01" value={b.exhibition} onChange={e=>update(i,'exhibition',e.target.value)}/></td>
      <td><input className="input" type="number" step="0.5" value={b.tilt} onChange={e=>update(i,'tilt',e.target.value)}/></td>
      <td><input className="input" type="number" step="0.1" value={b.weight} onChange={e=>update(i,'weight',e.target.value)}/></td>
    </tr>)}</tbody></table>
  </div>
}
