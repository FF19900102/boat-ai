'use client';
import { Venue } from '@/lib/types';
export default function VenueSelector({venues,selected,onSelect}:{venues:Venue[];selected:string;onSelect:(id:string)=>void}){return <div className="grid grid4">{venues.map(v=><button key={v.id} className={`venueBtn ${selected===v.id?'active':''}`} onClick={()=>onSelect(v.id)}><b>{v.name}</b><br/><span className="small muted">{v.region}{v.night?'・ナイター':''}</span></button>)}</div>}
