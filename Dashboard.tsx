'use client';
import { Racer, Weather } from '@/lib/types';
import { calcLaneProbabilities } from '@/lib/boatAi';
export default function ProbabilityTable({racers,weather}:{racers:Racer[];weather:Weather}){const rows=calcLaneProbabilities(racers,weather);return <div className="scroll"><table className="table"><thead><tr><th>順位</th><th>艇</th><th>選手</th><th>スコア</th><th>1着率</th><th>2連対</th><th>3連対</th></tr></thead><tbody>{rows.map((r,i)=><tr key={r.racer.lane}><td className={i<3?`rank${i+1}`:''}>{i+1}</td><td>{r.racer.lane}</td><td>{r.racer.name}</td><td>{r.score.toFixed(1)}</td><td>{(r.first*100).toFixed(1)}%</td><td>{(r.in2*100).toFixed(1)}%</td><td>{(r.in3*100).toFixed(1)}%</td></tr>)}</tbody></table></div>}
