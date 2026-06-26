'use client';
export default function RaceSelector({value,onChange}:{value:number,onChange:(v:number)=>void}){return <div className="grid grid4">{Array.from({length:12},(_,i)=>i+1).map(n=><button key={n} className={`btn raceBtn ${value===n?'active':''}`} onClick={()=>onChange(n)}>{n}R</button>)}</div>}
