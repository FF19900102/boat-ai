import Link from 'next/link';
export default function RaceButtons({venue}:{venue:string}){return <div className="grid grid4">{Array.from({length:12},(_,i)=>i+1).map(n=><Link key={n} className="card btn" href={`/race/${venue}/${n}`}>{n}R</Link>)}</div>}
