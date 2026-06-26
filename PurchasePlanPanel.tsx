import Link from 'next/link';import {Race} from '@/types/boat';
export default function RaceCard({race}:{race:Race}){return <Link className="card" href={`/race/${race.venueId}/${race.raceNo}`}><div className="row"><strong>{race.raceNo}R</strong><span className="pill">締切 {race.deadline}</span></div><p className="muted">{race.title}</p></Link>}
