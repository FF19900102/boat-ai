import Link from 'next/link';
import { Venue } from '@/lib/types';
export default function VenueCard({venue}:{venue:Venue}){return <Link href={`/race/${venue.id}`} className="card venue"><div className="row" style={{justifyContent:'space-between'}}><div className="venueName">{venue.name}</div>{venue.night&&<span className="tag">ナイター</span>}</div><div className="muted">{venue.region}</div>{venue.note&&<div className="small warn">{venue.note}</div>}</Link>}
