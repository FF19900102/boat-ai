'use client';
import {useEffect,useState} from 'react';
export default function LiveStatusPanel(){const[time,setTime]=useState('');useEffect(()=>{const f=()=>setTime(new Date().toLocaleTimeString('ja-JP',{hour12:false}));f();const id=setInterval(f,30000);return()=>clearInterval(id)},[]);return <div className="card"><div className="row"><div><h3>速報監視</h3><p className="mini">現在は手動/モック。次工程で結果速報取得APIを接続。</p></div><span className="pill">最終確認 {time}</span></div><div className="bar"><span style={{width:'62%'}}/></div></div>}
