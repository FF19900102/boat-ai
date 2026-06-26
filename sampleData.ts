'use client';

import { useMemo, useState } from 'react';
import { defaultBoats, defaultWeather, venues } from '@/lib/sampleData';
import { Boat, Weather } from '@/lib/types';
import { generateTickets, judgeRace, top3Probabilities } from '@/lib/boatAi';

const today = new Date().toISOString().slice(0, 10);

export default function HomePage() {
  const [venueId, setVenueId] = useState('hamanako');
  const [raceNo, setRaceNo] = useState(1);
  const [boats, setBoats] = useState<Boat[]>(defaultBoats);
  const [weather, setWeather] = useState<Weather>(defaultWeather);
  const [result, setResult] = useState('');
  const [stake, setStake] = useState(1000);
  const [payout, setPayout] = useState(0);
  const venue = venues.find((v) => v.id === venueId) ?? venues[0];

  const ranking = useMemo(() => top3Probabilities(boats, weather), [boats, weather]);
  const tickets = useMemo(() => generateTickets(boats, weather).slice(0, 20), [boats, weather]);
  const raceJudge = judgeRace(tickets);
  const topTicket = tickets[0];
  const hit = result && tickets.slice(0, 5).some((t) => t.combo === result);
  const profit = payout - stake;

  function updateBoat(index: number, key: keyof Boat, value: string) {
    setBoats((prev) => prev.map((b, i) => {
      if (i !== index) return b;
      const textKeys: Array<keyof Boat> = ['name', 'className'];
      return { ...b, [key]: textKeys.includes(key) ? value : Number(value) } as Boat;
    }));
  }

  return (
    <main className="container">
      <header className="header">
        <div>
          <div className="brand">Boat AI</div>
          <div className="sub">確率・期待値・結果検証で見る競艇AI</div>
        </div>
        <span className="badge">REAL CODE 11</span>
      </header>

      <section className="grid grid2">
        <div className="card">
          <h2 className="title">本日開催場</h2>
          <div className="sub">現段階は手動選択。次工程で公式データ取得に接続。</div>
          <div className="venues" style={{ marginTop: 12 }}>
            {venues.map((v) => (
              <button key={v.id} className={`venue ${venueId === v.id ? 'active' : ''}`} onClick={() => setVenueId(v.id)}>
                <b>{v.name}</b><br />
                <span className="sub">{v.region}{v.night ? ' / ナイター' : ''}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="title">レース選択</h2>
          <div className="metric"><span>日付</span><b>{today}</b></div>
          <div className="metric"><span>選択場</span><b>{venue.name}</b></div>
          <div className="races" style={{ marginTop: 12 }}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <button key={n} className={`race ${raceNo === n ? 'active' : ''}`} onClick={() => setRaceNo(n)}>{n}R</button>
            ))}
          </div>
        </div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2 className="title">出走表入力</h2>
        <div className="tableWrap">
          <table>
            <thead>
              <tr><th>艇</th><th>選手</th><th>級</th><th>全国</th><th>当地</th><th>ST</th><th>モーター</th><th>ボート</th><th>展示</th><th>チルト</th><th>体重</th><th>進入</th></tr>
            </thead>
            <tbody>
              {boats.map((b, i) => (
                <tr key={b.frame}>
                  <td>{b.frame}</td>
                  <td><input value={b.name} onChange={(e) => updateBoat(i, 'name', e.target.value)} /></td>
                  <td><input value={b.className} onChange={(e) => updateBoat(i, 'className', e.target.value)} /></td>
                  <td><input type="number" step="0.1" value={b.nationalWin} onChange={(e) => updateBoat(i, 'nationalWin', e.target.value)} /></td>
                  <td><input type="number" step="0.1" value={b.localWin} onChange={(e) => updateBoat(i, 'localWin', e.target.value)} /></td>
                  <td><input type="number" step="0.01" value={b.avgST} onChange={(e) => updateBoat(i, 'avgST', e.target.value)} /></td>
                  <td><input type="number" value={b.motorRate} onChange={(e) => updateBoat(i, 'motorRate', e.target.value)} /></td>
                  <td><input type="number" value={b.boatRate} onChange={(e) => updateBoat(i, 'boatRate', e.target.value)} /></td>
                  <td><input type="number" step="0.01" value={b.exhibition} onChange={(e) => updateBoat(i, 'exhibition', e.target.value)} /></td>
                  <td><input type="number" step="0.5" value={b.tilt} onChange={(e) => updateBoat(i, 'tilt', e.target.value)} /></td>
                  <td><input type="number" value={b.weight} onChange={(e) => updateBoat(i, 'weight', e.target.value)} /></td>
                  <td><input type="number" value={b.course} onChange={(e) => updateBoat(i, 'course', e.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid3" style={{ marginTop: 16 }}>
        <div className="card">
          <h2 className="title">水面・気象</h2>
          <label className="sub">天候</label><input value={weather.condition} onChange={(e) => setWeather({ ...weather, condition: e.target.value })} />
          <label className="sub">風向</label><input value={weather.windDirection} onChange={(e) => setWeather({ ...weather, windDirection: e.target.value })} />
          <label className="sub">風速</label><input type="number" value={weather.windSpeed} onChange={(e) => setWeather({ ...weather, windSpeed: Number(e.target.value) })} />
          <label className="sub">波高</label><input type="number" value={weather.wave} onChange={(e) => setWeather({ ...weather, wave: Number(e.target.value) })} />
        </div>

        <div className="card">
          <h2 className="title">AI判定</h2>
          <div className="metric"><span>判定</span><b>{raceJudge}</b></div>
          <div className="metric"><span>最上位買い目</span><b>{topTicket?.combo}</b></div>
          <div className="metric"><span>期待値</span><b>{topTicket?.ev.toFixed(1)}</b></div>
          <div className="metric"><span>的中確率</span><b>{((topTicket?.probability ?? 0) * 100).toFixed(2)}%</b></div>
        </div>

        <div className="card">
          <h2 className="title">結果入力</h2>
          <label className="sub">確定3連単</label><input placeholder="例 1-3-2" value={result} onChange={(e) => setResult(e.target.value)} />
          <label className="sub">投資額</label><input type="number" value={stake} onChange={(e) => setStake(Number(e.target.value))} />
          <label className="sub">払戻金</label><input type="number" value={payout} onChange={(e) => setPayout(Number(e.target.value))} />
          <div className="metric"><span>判定</span><b>{result ? (hit ? '推奨内的中' : '不的中') : '未入力'}</b></div>
          <div className="metric"><span>収支</span><b>{profit.toLocaleString()}円</b></div>
        </div>
      </section>

      <section className="grid grid2" style={{ marginTop: 16 }}>
        <div className="card">
          <h2 className="title">各艇 確率ランキング</h2>
          <div className="tableWrap">
            <table>
              <thead><tr><th>艇</th><th>選手</th><th>AIスコア</th><th>1着率</th><th>2連対</th><th>3連対</th></tr></thead>
              <tbody>
                {ranking.map((r) => (
                  <tr key={r.frame}>
                    <td>{r.frame}</td><td>{r.name}</td><td>{r.score.toFixed(1)}</td><td>{(r.p1 * 100).toFixed(1)}%</td><td>{(r.p2 * 100).toFixed(1)}%</td><td>{(r.p3 * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2 className="title">3連単 期待値ランキング</h2>
          <div className="tableWrap">
            <table>
              <thead><tr><th>買い目</th><th>確率</th><th>推定オッズ</th><th>期待値</th><th>判定</th></tr></thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.combo}>
                    <td><b>{t.combo}</b></td><td>{(t.probability * 100).toFixed(2)}%</td><td>{t.odds.toFixed(1)}</td><td>{t.ev.toFixed(1)}</td><td className={t.ev >= 120 ? 'buy' : t.ev >= 100 ? 'warn' : 'skip'}>{t.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className="footer">次工程：結果保存、成績ダッシュボード、公式データ取得API接続。</div>
    </main>
  );
}
