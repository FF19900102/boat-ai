
'use client';
import {useEffect,useState} from 'react';
import {KEYS,readList,writeList,deleteRace,downloadJson} from '../lib/storage';

export default function RaceDataManager({onLoad,current}){
  const [rows,setRows]=useState([]);
  useEffect(()=>{setRows(readList(KEYS.races));},[]);
  function refresh(){setRows(readList(KEYS.races));}
  function remove(id){deleteRace(id);refresh();}
  function exportAll(){downloadJson('boat-ai-races.json', readList(KEYS.races));}
  function importFile(e){
    const file=e.target.files?.[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        const data=JSON.parse(String(reader.result||'[]'));
        if(!Array.isArray(data)) throw new Error('array only');
        writeList(KEYS.races,[...data,...readList(KEYS.races)].slice(0,500));
        refresh(); alert('インポートしました');
      }catch{alert('JSONを読み込めませんでした');}
    };
    reader.readAsText(file);
  }
  return <section className="card">
    <div className="sectionHead"><h2>保存レース管理</h2><div className="actions"><button onClick={exportAll}>JSON出力</button><label className="fileBtn">JSON取込<input type="file" accept="application/json" onChange={importFile}/></label></div></div>
    <p className="muted">入力済みの出走表・気象・オッズを保存して、あとから読み戻せます。</p>
    <div className="savedList">{rows.length===0?<p className="muted">保存データはまだありません。</p>:rows.slice(0,8).map(r=><div className="savedItem" key={r.id}>
      <div><b>{r.venue} {r.race}R</b><span>{new Date(r.createdAt).toLocaleString('ja-JP')} / {r.memo||'メモなし'}</span></div>
      <button onClick={()=>onLoad(r)}>読込</button><button className="ghost" onClick={()=>remove(r.id)}>削除</button>
    </div>)}</div>
  </section>;
}
