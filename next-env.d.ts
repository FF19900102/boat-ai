'use client';
import { RaceInput, Trifecta } from '@/lib/types';
import { saveResult } from '@/lib/storage';
import { useState } from 'react';
export default function ResultPanel({race,trifectas,selected}:{race:RaceInput;trifectas:Trifecta[];selected:string[]}){
 const [result,setResult]=useState('1-2-3'); const [payout,setPayout]=useState(0); const [unit,setUnit]=useState(100);
 const stake=selected.length*unit; const hit=selected.includes(result); const returnAmount=hit?payout:0; const profit=returnAmount-stake;
 const save=()=>{saveResult({id:crypto.randomUUID(),race,trifectas,selected,result,payout,stake,returnAmount,profit,hit,createdAt:new Date().toISOString()}); alert('保存しました')}
 return <div className="card"><h2 className="sectionTitle">結果入力・収支保存</h2><div className="grid grid4"><label>確定3連単<input value={result} onChange={e=>setResult(e.target.value)} placeholder="1-2-3"/></label><label>払戻金<input type="number" value={payout} onChange={e=>setPayout(Number(e.target.value))}/></label><label>1点金額<input type="number" value={unit} onChange={e=>setUnit(Number(e.target.value))}/></label><button className="primary" onClick={save}>結果を保存</button></div><div className="row" style={{marginTop:12}}><span className="pill">購入点数 {selected.length}</span><span className="pill">投資 {stake.toLocaleString()}円</span><span className={hit?'good':'bad'}>{hit?'的中':'不的中'}</span><span className={profit>=0?'good':'bad'}>収支 {profit.toLocaleString()}円</span></div></div>
}
