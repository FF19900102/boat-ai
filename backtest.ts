'use client';
import {useEffect,useState} from 'react';
export default function RaceMemo({raceId}:{raceId:string}){const key=`boat-ai-memo-${raceId}`;const[m,setM]=useState('');useEffect(()=>setM(localStorage.getItem(key)||''),[key]);function save(v:string){setM(v);localStorage.setItem(key,v)}return <div className="card"><h3>レースメモ</h3><textarea value={m} onChange={e=>save(e.target.value)} placeholder="展示気配、気になるコメントなど" style={{width:'100%',minHeight:90,background:'#08192b',color:'var(--text)',border:'1px solid var(--line)',borderRadius:10,padding:10}}/></div>}
