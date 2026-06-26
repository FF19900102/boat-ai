
import {modelLeague} from '../lib/modelAi';
export default function AiLeague({boats,odds,weather}){
  const rows=modelLeague(boats,odds,weather);
  return <section className="card"><h2>AIリーグ戦</h2><p className="muted">複数AIを同じレースで競わせ、どの考え方が強いか比較します。</p><div className="league">{rows.map((r,i)=><div className="leagueRow" key={r.id}>
    <div className="rankNo">{i+1}</div><div><b>{r.name}</b><span>{r.desc}</span></div><div><em>{r.top?.key}</em><span>EV {r.top?.ev.toFixed(0)}</span></div><div><strong>{r.confidence.toFixed(0)}%</strong><span>信頼度</span></div>
  </div>)}</div></section>;
}
