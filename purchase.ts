import {BacktestRace} from '@/types/boat';
import {yen} from '@/lib/format';
export default function BacktestRaceTable({rows}:{rows:BacktestRace[]}){
  return <div className="card" style={{overflowX:'auto'}}><table className="table"><thead><tr><th>場</th><th>R</th><th>推奨</th><th>結果</th><th>投資</th><th>払戻</th><th>収支</th></tr></thead><tbody>{rows.slice(0,36).map(r=><tr key={r.race.id}><td>{r.race.venueId}</td><td>{r.race.raceNo}R</td><td>{r.recommended.slice(0,2).map(x=>x.combo).join(' / ')}</td><td><b className={r.hit?'good':'bad'}>{r.actual}</b></td><td>{yen(r.betAmount)}</td><td>{yen(r.payout)}</td><td className={r.profit>=0?'good':'bad'}>{yen(r.profit)}</td></tr>)}</tbody></table></div>
}
