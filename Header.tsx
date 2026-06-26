import Link from 'next/link';
import { Header } from '@/components/Header';
import { getVenueRaces } from '@/services/raceService';
export default async function Races({searchParams}:{searchParams:{venue?:string}}){const venue=searchParams.venue??'hamanako';const races=await getVenueRaces(venue);return <main className="container"><Header/><h1 className="title">レース選択</h1><div className="grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))'}}>{races.map(r=><Link className="card" href={`/races/${r.venueId}-${r.raceNo}`} key={r.id}><h2>{r.raceNo}R</h2><p>{r.title}</p><p className="muted">締切 {r.deadline}</p></Link>)}</div></main>}
