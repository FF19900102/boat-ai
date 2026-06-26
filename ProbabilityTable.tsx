'use client';
export default function RaceSelector({raceNo,setRaceNo}:{raceNo:number;setRaceNo:(n:number)=>void}){return <div className="grid grid4">{Array.from({length:12},(_,i)=>i+1).map(n=><button key={n} className={`raceBtn ${raceNo===n?'active':''}`} onClick={()=>setRaceNo(n)}>{n}R</button>)}</div>}
