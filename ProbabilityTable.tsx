'use client';
import { Boat } from '@/lib/types';

type Props = { boats: Boat[]; onChange: (boats: Boat[]) => void };
const numFields: (keyof Boat)[] = ['nationalRate','localRate','avgST','motorRate','boatRate','exhibition','tilt','weight','course'];

export function BoatTable({ boats, onChange }: Props) {
  function update(index: number, key: keyof Boat, value: string) {
    const next = boats.map((b, i) => i === index ? { ...b, [key]: numFields.includes(key) ? Number(value) : value } : b);
    onChange(next);
  }
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>枠</th><th>選手名</th><th>級</th><th>全国</th><th>当地</th><th>平均ST</th><th>モーター</th><th>ボート</th><th>展示</th><th>チルト</th><th>体重</th><th>進入</th></tr></thead>
        <tbody>
          {boats.map((b, i) => (
            <tr key={b.frame}>
              <td>{b.frame}</td>
              <td><input value={b.name} onChange={(e) => update(i, 'name', e.target.value)} /></td>
              <td><input value={b.class} onChange={(e) => update(i, 'class', e.target.value)} /></td>
              {numFields.map((key) => <td key={key}><input type="number" step="0.01" value={String(b[key])} onChange={(e) => update(i, key, e.target.value)} /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
