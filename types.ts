'use client';
import { Racer, Ticket, Weather } from '@/lib/types';
import { generateTickets } from '@/lib/boatAi';
export default function TicketTable({racers,weather,oddsMap,setOddsMap,onTickets}:{racers:Racer[];weather:Weather;oddsMap:Record<string,number>;setOddsMap:(m:Record<string,number>)=>void;onTickets:(t:Ticket[])=>void}){
 const tickets=generateTickets(racers,weather,oddsMap); onTickets(tickets);
 const setOdds=(combo:string,v:string)=>setOddsMap({...oddsMap,[combo]:Number(v)});
 return <div className="scroll"><table className="table"><thead><tr><th>買い目</th><th>的中確率</th><th>オッズ</th><th>期待値</th><th>判定</th></tr></thead><tbody>{tickets.slice(0,30).map(t=><tr key={t.combo} className={t.judge==='買い候補'?'buy':t.judge==='注意'?'watch':'skip'}><td><b>{t.combo}</b></td><td>{(t.probability*100).toFixed(2)}%</td><td><input className="input" style={{maxWidth:90}} type="number" step="0.1" value={oddsMap[t.combo] ?? t.odds} onChange={e=>setOdds(t.combo,e.target.value)} /></td><td className={t.ev>=120?'good':t.ev>=100?'warn':'bad'}>{t.ev.toFixed(1)}</td><td>{t.judge}</td></tr>)}</tbody></table></div>
}
