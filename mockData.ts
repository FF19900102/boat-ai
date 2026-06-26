'use client';
import { useState } from 'react';
import { RaceResult, SavedRace, Ticket } from '@/lib/types';
import { saveRace } from '@/lib/storage';
export default function ResultPanel({race,topTickets,onSaved}:{race:Omit<SavedRace,'result'>;topTickets:Ticket[];onSaved:()=>void}){
 const [result,setResult]=useState('1-2-3'); const [payout,setPayout]=useState(0); const [stake,setStake]=useState(1000); const [bought,setBought]=useState(topTickets[0]?.combo || '');
 const save=()=>{const hit=result===bought; const rr:RaceResult={result,payout,stake,bought,hit,profit:(hit?payout:0)-stake}; saveRace({...race,result:rr}); onSaved(); alert(hit?'的中で保存しました':'不的中で保存しました')};
 return <div className="grid grid4"><label><span className="label">確定3連単</span><input className="input" value={result} onChange={e=>setResult(e.target.value)} /></label><label><span className="label">払戻金</span><input className="input" type="number" value={payout} onChange={e=>setPayout(Number(e.target.value))} /></label><label><span className="label">投資額</span><input className="input" type="number" value={stake} onChange={e=>setStake(Number(e.target.value))} /></label><label><span className="label">購入買い目</span><input className="input" value={bought} onChange={e=>setBought(e.target.value)} /></label><button className="primary" onClick={save}>結果を保存</button></div>
}
