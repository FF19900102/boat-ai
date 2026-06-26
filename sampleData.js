'use client';
import {useEffect,useState} from 'react';
import {summaryStats} from '../lib/stats';
export default function StatsMini(){
 const [stats,setStats]=useState(null);
 useEffect(()=>{ const rows=JSON.parse(localStorage.getItem('boat-ai-results')||'[]'); setStats(summaryStats(rows)); },[]);
 if(!stats) return null;
 return <section className="miniStats"><div><span>保存レース</span><b>{stats.count}</b></div><div><span>的中率</span><b>{stats.hitRate.toFixed(1)}%</b></div><div><span>回収率</span><b>{stats.returnRate.toFixed(1)}%</b></div><div><span>総収支</span><b>{stats.profit.toLocaleString()}円</b></div></section>
}
