import Link from 'next/link';
import { Header } from '@/components/Header';
import { getTodayVenues } from '@/services/raceService';
export default async function Home(){const venues=await getTodayVenues();return <main className="container"><Header/><h1 className="title">本日開催</h1><div className="grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))'}}>{venues.map(v=><Link className="card" key={v.id} href={`/races?venue=${v.id}`}><h2>{v.name}</h2><p className="muted">{v.region}</p><span className={v.isOpen?'good':'bad'}>{v.isOpen?'開催中':'非開催'}</span></Link>)}</div></main>}
