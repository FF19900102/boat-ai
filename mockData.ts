'use client';
import { useState } from 'react';
import { RaceResult, SavedRace, Ticket } from '@/lib/types';
export default function ResultPanel({tickets,onSave}:{tickets:Ticket[],onSave:(r:RaceResult)=>void}){
 const [order,setOrder]=useState('1-2-3'); const [payout,setPayout]=useState(0); const [stake,setStake]=useState(1000); const [bought,setBought]=useState(tickets[0]?.key||'');
 const hit=bought===order; const profit=(hit?payout:0)-stake;
 return <div className="grid grid2"><div className="card"><h3 className="title">結果入力</h3><div className="formgrid"><div><label>確定3連単</label><input value={order} onChange={e=>setOrder(e.target.value)}/></div><div><label>払戻金</label><input type="number" value={payout} onChange={e=>setPayout(Number(e.target.value))}/></div><div><label>投資額</label><input type="number" value={stake} onChange={e=>setStake(Number(e.target.value))}/></div><div><label>購入買い目</label><input value={bought} onChange={e=>setBought(e.target.value)}/></div></div><p className={hit?'green':'red'}>{hit?'的中':'不的中'} / 収支 {profit.toLocaleString()}円</p><button className="btn primary" onClick={()=>onSave({order,payout,stake,bought})}>結果を保存</button></div></div>
}
