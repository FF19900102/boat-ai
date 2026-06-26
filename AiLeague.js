export default function OddsEditor({tickets,odds,setOdds}){
  function update(key,value){ setOdds({...odds,[key]:value}); }
  return <section className="card"><h2>オッズ入力 上位12点</h2><p className="muted">公式オッズ自動取得を入れるまでは、ここに手入力できます。</p><div className="oddsGrid">{tickets.map(t=><label key={t.key}>{t.key}<input type="number" step="0.1" value={odds[t.key] ?? ''} placeholder={String(t.odds)} onChange={e=>update(t.key,e.target.value)}/></label>)}</div></section>
}
