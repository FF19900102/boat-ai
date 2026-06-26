'use client';
import type { Racer } from '@/lib/types';

export function RacerTable({ racers, onChange }: { racers: Racer[]; onChange: (racers: Racer[]) => void }) {
  function update(index: number, key: keyof Racer, value: string) {
    const next = [...racers];
    const old = next[index];
    next[index] = { ...old, [key]: key === 'name' || key === 'className' ? value : Number(value) } as Racer;
    onChange(next);
  }

  return (
    <section className="card">
      <h2>出走表・展示データ</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>枠</th><th>選手</th><th>級</th><th>全国</th><th>当地</th><th>平均ST</th><th>モーター</th><th>ボート</th><th>展示</th><th>チルト</th><th>体重</th><th>単勝目安</th>
            </tr>
          </thead>
          <tbody>
            {racers.map((r, i) => (
              <tr key={r.lane}>
                <td>{r.lane}</td>
                <td><input value={r.name} onChange={(e) => update(i, 'name', e.target.value)} /></td>
                <td><select value={r.className} onChange={(e) => update(i, 'className', e.target.value)}><option>A1</option><option>A2</option><option>B1</option><option>B2</option></select></td>
                <td><input type="number" step="0.1" value={r.nationalWinRate} onChange={(e) => update(i, 'nationalWinRate', e.target.value)} /></td>
                <td><input type="number" step="0.1" value={r.localWinRate} onChange={(e) => update(i, 'localWinRate', e.target.value)} /></td>
                <td><input type="number" step="0.01" value={r.avgStart} onChange={(e) => update(i, 'avgStart', e.target.value)} /></td>
                <td><input type="number" step="0.1" value={r.motorRate} onChange={(e) => update(i, 'motorRate', e.target.value)} /></td>
                <td><input type="number" step="0.1" value={r.boatRate} onChange={(e) => update(i, 'boatRate', e.target.value)} /></td>
                <td><input type="number" step="0.01" value={r.exhibitionTime} onChange={(e) => update(i, 'exhibitionTime', e.target.value)} /></td>
                <td><input type="number" step="0.5" value={r.tilt} onChange={(e) => update(i, 'tilt', e.target.value)} /></td>
                <td><input type="number" step="0.1" value={r.weight} onChange={(e) => update(i, 'weight', e.target.value)} /></td>
                <td><input type="number" step="0.1" value={r.oddsWin} onChange={(e) => update(i, 'oddsWin', e.target.value)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
