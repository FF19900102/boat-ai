'use client';
import {useEffect,useMemo,useState} from 'react';
import Header from '../../components/Header';
import {summaryStats,groupByVenue,groupByEv} from '../../lib/stats';

export default function Dashboard(){
 const [rows,setRows]=useState([]);
 useEffect(()=>{ setRows(JSON.parse(localStorage.getItem('boat-ai-results')||'[]')); },[]);
 const stats=useMemo(()=>summaryStats(rows),[rows]);
 const venues=useMemo(()=>groupByVenue(rows),[rows]);
 const evs=useMemo(()=>groupByEv(rows),[rows]);
 function clearAll(){ if(confirm('保存した結果をすべて削除しますか？')){ localStorage.removeItem('boat-ai-results'); setRows([]); } }
 return <main><Header/>
  <section className="hero"><div><h1>成績ダッシュボード</h1><p>的中率・回収率・競艇場別・期待値別の検証</p></div><div className="badge">検証</div></section>
  <section className="miniStats"><div><span>保存レース</span><b>{stats.count}</b></div><div><span>的中</span><b>{stats.hits}</b></div><div><span>的中率</span><b>{stats.hitRate.toFixed(1)}%</b></div><div><span>回収率</span><b>{stats.returnRate.toFixed(1)}%</b></div><div><span>総収支</span><b>{stats.profit.toLocaleString()}円</b></div></section>
  <section className="cols"><div className="card"><h2>競艇場別成績</h2><table><thead><tr><th>場</th><th>件数</th><th>的中率</th><th>回収率</th><th>収支</th></tr></thead><tbody>{venues.map(v=><tr key={v.name}><td>{v.name}</td><td>{v.count}</td><td>{v.hitRate.toFixed(1)}%</td><td>{v.returnRate.toFixed(1)}%</td><td>{v.profit.toLocaleString()}円</td></tr>)}</tbody></table></div><div className="card"><h2>期待値別成績</h2><table><thead><tr><th>EV帯</th><th>件数</th><th>的中率</th><th>回収率</th></tr></thead><tbody>{evs.map(v=><tr key={v.name}><td>{v.name}</td><td>{v.count}</td><td>{v.hitRate.toFixed(1)}%</td><td>{v.returnRate.toFixed(1)}%</td></tr>)}</tbody></table></div></section>
  <section className="card"><div className="sectionHead"><h2>履歴</h2><button onClick={clearAll}>全削除</button></div><div className="tableWrap"><table><thead><tr><th>日付</th><th>場</th><th>R</th><th>予想</th><th>結果</th><th>投資</th><th>払戻</th><th>収支</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{new Date(r.createdAt).toLocaleString('ja-JP')}</td><td>{r.venue}</td><td>{r.race}R</td><td>{r.ticket}</td><td>{r.finish}</td><td>{Number(r.stake).toLocaleString()}</td><td>{Number(r.payout).toLocaleString()}</td><td>{Number(r.profit).toLocaleString()}</td></tr>)}</tbody></table></div></section>
 </main>
}
