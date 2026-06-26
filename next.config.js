'use client';
import { Trifecta } from '@/lib/types';
export default function TrifectaTable({items,selected,setSelected}:{items:Trifecta[];selected:string[];setSelected:(v:string[])=>void}){
 const toggle=(key:string)=> selected.includes(key)?setSelected(selected.filter(x=>x!==key)):setSelected([...selected,key]);
 return <div className="card"><h2 className="sectionTitle">3連単 期待値ランキング</h2><div className="tableWrap"><table><thead><tr><th>買う</th><th>順位</th><th>買い目</th><th>的中確率</th><th>想定オッズ</th><th>期待値</th><th>判定</th></tr></thead><tbody>{items.slice(0,30).map((t,i)=><tr key={t.key}><td><input type="checkbox" checked={selected.includes(t.key)} onChange={()=>toggle(t.key)}/></td><td>{i+1}</td><td><b>{t.key}</b></td><td>{(t.probability*100).toFixed(2)}%</td><td>{t.odds.toFixed(1)}</td><td className={t.ev>=120?'good':t.ev>=100?'warn':'bad'}>{t.ev.toFixed(0)}</td><td>{t.judge}</td></tr>)}</tbody></table></div></div>
}
