'use client';

import { useState } from 'react';
import { saveBetRecord } from '@/lib/storage';

type Props = {
  raceId: string;
  venueName: string;
  raceTitle: string;
  defaultCombination: string;
};

export default function BetForm({ raceId, venueName, raceTitle, defaultCombination }: Props) {
  const [combination, setCombination] = useState(defaultCombination);
  const [stake, setStake] = useState(1000);
  const [payout, setPayout] = useState(0);
  const [saved, setSaved] = useState(false);

  return (
    <div className="card">
      <h2>購入記録</h2>
      <div className="grid">
        <label>買い目<input className="input" value={combination} onChange={e=>setCombination(e.target.value)} /></label>
        <label>投資額<input className="input" type="number" value={stake} onChange={e=>setStake(Number(e.target.value))} /></label>
        <label>払戻<input className="input" type="number" value={payout} onChange={e=>setPayout(Number(e.target.value))} /></label>
      </div>
      <button className="btn section" onClick={() => {
        saveBetRecord({
          id: crypto.randomUUID(),
          raceId,
          venueName,
          raceTitle,
          combination,
          stake,
          payout,
          hit: payout > 0,
          createdAt: new Date().toISOString()
        });
        setSaved(true);
      }}>保存</button>
      {saved && <p className="good">保存しました</p>}
    </div>
  );
}
