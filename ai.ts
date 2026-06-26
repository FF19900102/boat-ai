'use client';
import { SavedRace } from '@/lib/types';
export default function Dashboard({races}:{races:SavedRace[]}){
 const done=races.filter(r=>r.result); const stake=done.reduce((a,r)=>a+(r.result?.stake||0),0); const pay=done.reduce((a,r)=>a+((r.result?.bought===r.result?.order)?(r.result?.payout||0):0),0); const hit=done.filter(r=>r.result?.bought===r.result?.order).length; const roi=stake?Math.round(pay/stake*100):0;
 return <div className="grid grid4"><div className="card"><div className="small">保存レース</div><div className="stat">{races.length}</div></div><div className="card"><div className="small">的中率</div><div className="stat blue">{done.length?Math.round(hit/done.length*100):0}%</div></div><div className="card"><div className="small">回収率</div><div className={`stat ${roi>=100?'green':'red'}`}>{roi}%</div></div><div className="card"><div className="small">収支</div><div className={`stat ${pay-stake>=0?'green':'red'}`}>{(pay-stake).toLocaleString()}</div></div></div>
}
