"use client";
import { useMemo, useState } from "react";
import { venues, makeEntries } from "@/lib/mockData";
import { BoatEntry, SavedRace, Weather } from "@/lib/types";
import { aiComment, probabilities, trifectaTickets } from "@/lib/boatAi";
import { clearRaces, loadSavedRaces, saveRace } from "@/lib/storage";

type Screen = "home" | "races" | "predict" | "dashboard";
const today = new Date().toISOString().slice(0, 10);
const defaultWeather: Weather = { weather: "晴", windDirection: "北", windSpeed: 2, waveHeight: 2 };

export default function BoatApp() {
  const [screen, setScreen] = useState<Screen>("home");
  const [venueId, setVenueId] = useState("hamanako");
  const [raceNo, setRaceNo] = useState(1);
  const [entries, setEntries] = useState<BoatEntry[]>(makeEntries("hamanako", 1));
  const [weather, setWeather] = useState<Weather>(defaultWeather);
  const [oddsMap, setOddsMap] = useState<Record<string, number>>({});
  const [boughtTickets, setBoughtTickets] = useState<string[]>([]);
  const [stake, setStake] = useState(100);
  const [resultCombo, setResultCombo] = useState("");
  const [payout, setPayout] = useState(0);
  const [saved, setSaved] = useState<SavedRace[]>([]);

  const venue = venues.find((v) => v.id === venueId) || venues[0];
  const probs = useMemo(() => probabilities(entries, weather), [entries, weather]);
  const tickets = useMemo(() => trifectaTickets(entries, weather, oddsMap), [entries, weather, oddsMap]);
  const topTickets = tickets.slice(0, 15);
  const totalStake = boughtTickets.length * stake;
  const hit = resultCombo ? boughtTickets.includes(resultCombo) : false;
  const profit = resultCombo ? (hit ? payout : 0) - totalStake : 0;

  function selectRace(vId: string, rNo: number) {
    setVenueId(vId); setRaceNo(rNo); setEntries(makeEntries(vId, rNo)); setScreen("predict");
    setBoughtTickets([]); setResultCombo(""); setPayout(0); setOddsMap({});
  }
  function updateEntry(i: number, key: keyof BoatEntry, value: string) {
    setEntries((prev) => prev.map((e, idx) => idx === i ? { ...e, [key]: key === "name" || key === "grade" ? value : Number(value) } : e));
  }
  function storeRace() {
    const race: SavedRace = {
      id: `${Date.now()}`,
      date: today,
      venueId: venue.id,
      venueName: venue.name,
      raceNo,
      weather,
      entries,
      tickets: topTickets,
      boughtTickets,
      stake: totalStake,
      resultCombo: resultCombo || undefined,
      payout: resultCombo ? payout : undefined,
      hit: resultCombo ? hit : undefined,
      profit: resultCombo ? profit : undefined,
      createdAt: new Date().toISOString()
    };
    saveRace(race); setSaved(loadSavedRaces()); alert("保存しました");
  }
  function loadDashboard() { setSaved(loadSavedRaces()); setScreen("dashboard"); }

  return <main className="min-h-screen">
    <header className="bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-5 flex items-center justify-between">
        <div><h1 className="text-2xl font-black">Boat AI</h1><p className="text-sm text-slate-300">確率・期待値・結果検証</p></div>
        <div className="flex gap-2"><button className="btn bg-white/10" onClick={()=>setScreen("home")}>開催場</button><button className="btn bg-white/10" onClick={loadDashboard}>成績</button></div>
      </div>
    </header>

    <section className="mx-auto max-w-7xl px-4 py-6">
      {screen === "home" && <Home onPick={(id)=>{setVenueId(id); setScreen("races");}} />}
      {screen === "races" && <RaceSelect venue={venue} onPick={(r)=>selectRace(venue.id, r)} />}
      {screen === "predict" && <Predict venueName={venue.name} raceNo={raceNo} entries={entries} weather={weather} setWeather={setWeather} updateEntry={updateEntry} probs={probs} tickets={topTickets} oddsMap={oddsMap} setOddsMap={setOddsMap} boughtTickets={boughtTickets} setBoughtTickets={setBoughtTickets} stake={stake} setStake={setStake} resultCombo={resultCombo} setResultCombo={setResultCombo} payout={payout} setPayout={setPayout} totalStake={totalStake} hit={hit} profit={profit} storeRace={storeRace} />}
      {screen === "dashboard" && <Dashboard saved={saved} reload={()=>setSaved(loadSavedRaces())} clear={()=>{clearRaces(); setSaved([]);}} />}
    </section>
  </main>;
}
function Home({ onPick }: { onPick: (id:string)=>void }) {
  return <div><div className="mb-5 flex items-end justify-between"><div><h2 className="text-2xl font-black">本日開催</h2><p className="text-slate-600">今は仮データ。後で公式データ取得に接続します。</p></div><span className="text-sm font-bold">{today}</span></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{venues.map(v=><button key={v.id} onClick={()=>onPick(v.id)} className={`card p-4 text-left hover:border-blue-500 ${!v.active?"opacity-45":""}`}><div className="flex justify-between"><b className="text-lg">{v.name}</b><span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{v.region}</span></div><p className="mt-2 text-sm text-slate-600">{v.water} / {v.active?"開催":"非開催"}</p></button>)}</div></div>;
}
function RaceSelect({ venue, onPick }: any) {
  return <div><h2 className="text-2xl font-black mb-1">{venue.name}</h2><p className="text-slate-600 mb-5">レースを選択</p><div className="grid grid-cols-3 gap-3 sm:grid-cols-6">{Array.from({length:12},(_,i)=><button key={i} onClick={()=>onPick(i+1)} className="card p-5 text-center hover:border-blue-500"><b className="text-xl">{i+1}R</b></button>)}</div></div>;
}
function Predict(props: any) {
  const { venueName, raceNo, entries, weather, setWeather, updateEntry, probs, tickets, oddsMap, setOddsMap, boughtTickets, setBoughtTickets, stake, setStake, resultCombo, setResultCombo, payout, setPayout, totalStake, hit, profit, storeRace } = props;
  const topEv = tickets[0]?.ev || 0;
  return <div className="space-y-6"><div className="card p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-black">{venueName} {raceNo}R</h2><p className="text-slate-600">AI判定：{aiComment(topEv)}</p></div><button className="btn btn-primary" onClick={storeRace}>保存</button></div></div>
    <div className="grid gap-4 lg:grid-cols-4"><WeatherBox weather={weather} setWeather={setWeather}/><Probability probs={probs}/></div>
    <EntryTable entries={entries} updateEntry={updateEntry}/>
    <Tickets tickets={tickets} oddsMap={oddsMap} setOddsMap={setOddsMap} boughtTickets={boughtTickets} setBoughtTickets={setBoughtTickets}/>
    <ResultBox stake={stake} setStake={setStake} resultCombo={resultCombo} setResultCombo={setResultCombo} payout={payout} setPayout={setPayout} totalStake={totalStake} hit={hit} profit={profit}/>
  </div>;
}
function WeatherBox({ weather, setWeather }: any) { return <div className="card p-4 lg:col-span-1"><h3 className="font-black mb-3">気象</h3><div className="grid gap-2"><select className="field" value={weather.weather} onChange={e=>setWeather({...weather, weather:e.target.value})}>{["晴","曇","雨","雪"].map(x=><option key={x}>{x}</option>)}</select><input className="field" value={weather.windDirection} onChange={e=>setWeather({...weather, windDirection:e.target.value})} placeholder="風向"/><input className="field" type="number" value={weather.windSpeed} onChange={e=>setWeather({...weather, windSpeed:Number(e.target.value)})} placeholder="風速"/><input className="field" type="number" value={weather.waveHeight} onChange={e=>setWeather({...weather, waveHeight:Number(e.target.value)})} placeholder="波高"/></div></div>; }
function Probability({ probs }: any) { return <div className="card p-4 lg:col-span-3"><h3 className="font-black mb-3">各艇確率</h3><div className="overflow-x-auto"><table className="w-full"><thead><tr><th className="th">艇</th><th className="th">選手</th><th className="th">1着率</th><th className="th">2着以内</th><th className="th">3着以内</th></tr></thead><tbody>{probs.map((p:any)=><tr key={p.lane}><td className="td font-black">{p.lane}</td><td className="td">{p.name}</td><td className="td">{(p.first*100).toFixed(1)}%</td><td className="td">{(p.top2*100).toFixed(1)}%</td><td className="td">{(p.top3*100).toFixed(1)}%</td></tr>)}</tbody></table></div></div>; }
function EntryTable({ entries, updateEntry }: any) { const cols: [keyof BoatEntry,string][] = [["name","選手"],["grade","級"],["nationalWinRate","全国"],["localWinRate","当地"],["avgST","ST"],["motorRate","M2"],["boatRate","B2"],["exhibitionTime","展示"],["tilt","チルト"],["weight","体重"],["course","進入"]]; return <div className="card p-4"><h3 className="font-black mb-3">出走表入力</h3><div className="overflow-x-auto"><table className="w-full"><thead><tr><th className="th">枠</th>{cols.map(c=><th className="th" key={c[0]}>{c[1]}</th>)}</tr></thead><tbody>{entries.map((e:any,i:number)=><tr key={e.lane}><td className="td font-black">{e.lane}</td>{cols.map(([k])=><td className="td" key={k}><input className="field min-w-20" value={e[k]} type={k==="name"||k==="grade"?"text":"number"} step="0.01" onChange={ev=>updateEntry(i,k,ev.target.value)}/></td>)}</tr>)}</tbody></table></div></div>; }
function Tickets({ tickets, oddsMap, setOddsMap, boughtTickets, setBoughtTickets }: any) { function toggle(combo:string){ setBoughtTickets((prev:string[])=>prev.includes(combo)?prev.filter(x=>x!==combo):[...prev,combo]); } return <div className="card p-4"><h3 className="font-black mb-3">3連単 期待値ランキング</h3><div className="overflow-x-auto"><table className="w-full"><thead><tr><th className="th">買う</th><th className="th">買い目</th><th className="th">確率</th><th className="th">オッズ</th><th className="th">期待値</th><th className="th">判定</th></tr></thead><tbody>{tickets.map((t:any)=><tr key={t.combo}><td className="td"><input type="checkbox" checked={boughtTickets.includes(t.combo)} onChange={()=>toggle(t.combo)}/></td><td className="td font-black">{t.combo}</td><td className="td">{(t.probability*100).toFixed(2)}%</td><td className="td"><input className="field w-24" type="number" step="0.1" value={oddsMap[t.combo] || t.odds} onChange={e=>setOddsMap({...oddsMap,[t.combo]:Number(e.target.value)})}/></td><td className="td font-black">{t.ev.toFixed(0)}</td><td className="td">{t.rank}</td></tr>)}</tbody></table></div></div>; }
function ResultBox({ stake, setStake, resultCombo, setResultCombo, payout, setPayout, totalStake, hit, profit }: any) { return <div className="card p-4"><h3 className="font-black mb-3">結果入力・収支</h3><div className="grid gap-3 sm:grid-cols-5"><input className="field" type="number" value={stake} onChange={e=>setStake(Number(e.target.value))} placeholder="1点金額"/><input className="field" value={resultCombo} onChange={e=>setResultCombo(e.target.value)} placeholder="結果 1-2-3"/><input className="field" type="number" value={payout} onChange={e=>setPayout(Number(e.target.value))} placeholder="払戻金"/><div className="rounded-xl bg-slate-100 p-3 text-sm">投資 <b>{totalStake.toLocaleString()}</b>円</div><div className={`rounded-xl p-3 text-sm ${resultCombo ? hit ? "bg-green-100" : "bg-red-100" : "bg-slate-100"}`}>{resultCombo ? (hit ? "的中" : "不的中") : "結果待ち"} <b>{profit.toLocaleString()}</b>円</div></div></div>; }
function Dashboard({ saved, reload, clear }: any) { const count=saved.length; const totalStake=saved.reduce((s:any,r:any)=>s+(r.stake||0),0); const payout=saved.reduce((s:any,r:any)=>s+(r.hit?r.payout||0:0),0); const hits=saved.filter((r:any)=>r.hit).length; const roi=totalStake?Math.round(payout/totalStake*100):0; return <div className="space-y-4"><div className="flex justify-between"><h2 className="text-2xl font-black">成績</h2><div className="flex gap-2"><button className="btn btn-sub" onClick={reload}>更新</button><button className="btn btn-sub" onClick={clear}>削除</button></div></div><div className="grid gap-3 sm:grid-cols-4"><Stat title="保存レース" value={`${count}`}/><Stat title="的中率" value={`${count?Math.round(hits/count*100):0}%`}/><Stat title="回収率" value={`${roi}%`}/><Stat title="収支" value={`${(payout-totalStake).toLocaleString()}円`}/></div><div className="card p-4 overflow-x-auto"><table className="w-full"><thead><tr><th className="th">日付</th><th className="th">場</th><th className="th">R</th><th className="th">購入</th><th className="th">結果</th><th className="th">収支</th></tr></thead><tbody>{saved.map((r:any)=><tr key={r.id}><td className="td">{r.date}</td><td className="td">{r.venueName}</td><td className="td">{r.raceNo}R</td><td className="td">{r.boughtTickets.join(", ")}</td><td className="td">{r.resultCombo || "未"}</td><td className="td">{(r.profit || 0).toLocaleString()}円</td></tr>)}</tbody></table></div></div>; }
function Stat({ title, value }: any) { return <div className="card p-4"><p className="text-sm text-slate-500">{title}</p><b className="text-2xl">{value}</b></div>; }
