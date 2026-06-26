import {DataSourceReport} from '@/types/boat';
const label={connected:'接続済み',mock:'モック',waiting:'待機',error:'エラー'} as const;
const cls={connected:'source-ok',mock:'source-wait',waiting:'source-wait',error:'source-ng'} as const;
export default function DataSourceBadge({sources}:{sources:DataSourceReport[]}){return <div className="card"><h3>データ取得状態</h3><div className="status">{sources.map(s=><span key={s.name} className="pill"><b>{s.name}</b>：<span className={cls[s.status]}>{label[s.status]}</span></span>)}</div><div style={{marginTop:10}}>{sources.map(s=><p key={s.name} className="mini">{s.name} / {s.updatedAt} / {s.message}</p>)}</div></div>}
