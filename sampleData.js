'use client';

import { useMemo, useState } from 'react';
import { defaultBoats, venues } from '../lib/sampleData';
import { generateTrifecta, predictBoats } from '../lib/predict';

function percent(v) {
  return `${(v * 100).toFixed(1)}%`;
}

export default function Home() {
  const [venue, setVenue] = useState(venues[0]);
  const [raceNo, setRaceNo] = useState(1);
  const [boats, setBoats] = useState(defaultBoats);

  const predictions = useMemo(() => predictBoats(boats), [boats]);
  const tickets = useMemo(() => generateTrifecta(boats), [boats]);
  const topTicket = tickets[0];
  const decision = topTicket?.ev >= 120 ? '買い候補あり' : '見送り推奨';

  function updateBoat(index, key, value) {
    setBoats((prev) =>
      prev.map((boat, i) =>
        i === index ? { ...boat, [key]: key === 'name' ? value : Number(value) } : boat
      )
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl bg-slate-900/80 p-5 shadow-xl ring-1 ring-slate-700">
          <p className="text-sm text-cyan-300">Boat AI STEP1</p>
          <h1 className="text-3xl font-bold">競艇AI分析</h1>
          <p className="mt-2 text-slate-300">開催場選択 → レース選択 → 確率・期待値を表示</p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-900 p-4 ring-1 ring-slate-700">
            <label className="text-sm text-slate-300">開催場</label>
            <select
              className="mt-2 w-full rounded-xl bg-slate-800 p-3"
              value={venue.id}
              onChange={(e) => setVenue(venues.find((v) => v.id === e.target.value))}
            >
              {venues.map((v) => (
                <option key={v.id} value={v.id}>{v.name} / {v.status}</option>
              ))}
            </select>
          </div>
          <div className="rounded-2xl bg-slate-900 p-4 ring-1 ring-slate-700">
            <label className="text-sm text-slate-300">レース</label>
            <select className="mt-2 w-full rounded-xl bg-slate-800 p-3" value={raceNo} onChange={(e) => setRaceNo(Number(e.target.value))}>
              {Array.from({ length: venue.races }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}R</option>)}
            </select>
          </div>
          <div className="rounded-2xl bg-slate-900 p-4 ring-1 ring-slate-700">
            <p className="text-sm text-slate-300">AI判定</p>
            <p className="mt-2 text-2xl font-bold text-amber-300">{decision}</p>
            <p className="text-sm text-slate-400">{venue.name} {raceNo}R</p>
          </div>
        </section>

        <section className="rounded-2xl bg-slate-900 p-4 ring-1 ring-slate-700">
          <h2 className="mb-3 text-xl font-bold">出走データ入力</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="text-slate-300">
                <tr>
                  <th className="p-2 text-left">艇</th><th className="p-2 text-left">選手</th><th>全国</th><th>当地</th><th>ST</th><th>モーター</th><th>ボート</th><th>展示</th>
                </tr>
              </thead>
              <tbody>
                {boats.map((boat, i) => (
                  <tr key={boat.lane} className="border-t border-slate-800">
                    <td className="p-2 font-bold">{boat.lane}</td>
                    <td className="p-2"><input className="w-28 rounded bg-slate-800 p-2" value={boat.name} onChange={(e) => updateBoat(i, 'name', e.target.value)} /></td>
                    {['winRate','localRate','st','motor','boat','exhibition'].map((key) => (
                      <td key={key} className="p-2"><input type="number" step="0.01" className="w-24 rounded bg-slate-800 p-2" value={boat[key]} onChange={(e) => updateBoat(i, key, e.target.value)} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl bg-slate-900 p-4 ring-1 ring-slate-700">
            <h2 className="mb-3 text-xl font-bold">各艇確率</h2>
            <div className="space-y-2">
              {predictions.map((b) => (
                <div key={b.lane} className="grid grid-cols-5 items-center rounded-xl bg-slate-800 p-3 text-sm">
                  <div className="font-bold">{b.lane}号艇</div>
                  <div>{b.name}</div>
                  <div>1着 {percent(b.firstProb)}</div>
                  <div>2連 {percent(b.top2Prob)}</div>
                  <div>3連 {percent(b.top3Prob)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900 p-4 ring-1 ring-slate-700">
            <h2 className="mb-3 text-xl font-bold">期待値ランキング</h2>
            <div className="space-y-2">
              {tickets.map((t) => (
                <div key={t.combo} className="grid grid-cols-4 rounded-xl bg-slate-800 p-3 text-sm">
                  <div className="font-bold text-cyan-300">{t.combo}</div>
                  <div>確率 {percent(t.probability)}</div>
                  <div>仮オッズ {t.odds.toFixed(1)}</div>
                  <div className={t.ev >= 120 ? 'text-amber-300 font-bold' : ''}>EV {t.ev.toFixed(0)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
