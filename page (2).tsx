import Header from '@/components/Header';
import VenueCard from '@/components/VenueCard';
import { venues, todayText } from '@/lib/mockData';
export default function Home(){return <main className="wrap"><Header/><div className="card"><h1 className="sectionTitle">本日開催</h1><div className="muted">{todayText()} / まずは開催場を選択</div></div><div className="grid grid4" style={{marginTop:14}}>{venues.map(v=><VenueCard key={v.id} venue={v}/>)}</div></main>}
