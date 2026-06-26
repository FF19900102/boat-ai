import Header from '@/components/Header';
import RaceButtons from '@/components/RaceButtons';
import { venues } from '@/lib/mockData';
export default function RaceSelect({params}:{params:{venue:string}}){const venue=venues.find(v=>v.id===params.venue);return <main className="wrap"><Header/><div className="card"><h1 className="sectionTitle">{venue?.name ?? params.venue}</h1><div className="muted">レースを選択してください</div></div><div style={{marginTop:14}}><RaceButtons venue={params.venue}/></div></main>}
