'use client';
import { Boat } from '@/lib/types';
const fields:[keyof Boat,string,string][]=[['name','選手名','text'],['className','級別','text'],['nationalWin','全国勝率','number'],['localWin','当地勝率','number'],['avgST','平均ST','number'],['motorRate','モーター2連率','number'],['boatRate','ボート2連率','number'],['exhibition','展示タイム','number'],['tilt','チルト','number'],['weight','体重','number'],['course','進入','number']];
export default function BoatInput({boats,setBoats}:{boats:Boat[];setBoats:(b:Boat[])=>void}){
 const update=(i:number,k:keyof Boat,v:string)=>{const next=[...boats];(next[i] as any)[k]= k==='name'||k==='className'?v:Number(v);setBoats(next)};
 return <div className="card"><h2>出走表入力</h2><div style={{overflowX:'auto'}}><table className="table"><thead><tr><th>枠</th>{fields.map(f=><th key={String(f[0])}>{f[1]}</th>)}</tr></thead><tbody>{boats.map((b,i)=><tr key={b.frame}><td><b>{b.frame}</b></td>{fields.map(([k,label,type])=><td key={String(k)}><input className="input" type={type} step="0.01" value={(b as any)[k]} onChange={e=>update(i,k,e.target.value)} style={{minWidth:k==='name'?120:80}} /></td>)}</tr>)}</tbody></table></div></div>
}
