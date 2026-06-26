'use client';
import { venues } from '@/lib/mockData';
export default function VenueSelector({value,onChange}:{value:string,onChange:(v:string)=>void}){return <div className="grid grid4">{venues.map(v=><button key={v.id} className={`btn venue ${value===v.id?'active':''}`} onClick={()=>onChange(v.id)}><b>{v.name}</b><br/><span className="small">{v.region}・{v.water}</span></button>)}</div>}
