import {ModelScore} from '@/types/boat';
import {yen} from '@/lib/format';
export default function ModelScoreTable({rows}:{rows:ModelScore[]}){
  return <div className="card"><h2 className="section-title" style={{marginTop:0}}>AIリーグ戦</h2><table className="table"><thead><tr><th>AI</th><th>的中率</th><th>回収率</th><th>収支</th><th>採用率</th><th>状態</th></tr></thead><tbody>{rows.map(r=><tr key={r.name}><td><b>{r.name}</b></td><td>{r.hitRate}%</td><td className={r.returnRate>=100?'good':'bad'}>{r.returnRate}%</td><td className={r.profit>=0?'good':'bad'}>{yen(r.profit)}</td><td><div className="bar"><span style={{width:`${r.adoptionRate}%`}} /></div><div className="mini">{r.adoptionRate}%</div></td><td><span className="pill">{r.status}</span></td></tr>)}</tbody></table></div>
}
