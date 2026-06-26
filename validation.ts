import {AiReason} from '@/types/boat';
export default function AiReasonList({reasons}:{reasons:AiReason[]}){return <div className="card"><h3>AI判断理由</h3>{reasons.map((r,i)=><div className="reason" key={i}><strong className={r.impact==='plus'?'good':r.impact==='minus'?'bad':'warn'}>{r.title}</strong><p className="mini">{r.detail}</p></div>)}</div>}
