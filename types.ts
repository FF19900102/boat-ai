"use client";
import { useState } from "react";
import { RaceInput, RaceResult, TrifectaPick } from "@/lib/types";

export function ResultForm({ race, picks, onSave }: { race: RaceInput; picks: TrifectaPick[]; onSave: (result: RaceResult) => void }) {
  const [resultKey, setResultKey] = useState("1-2-3");
  const [payout, setPayout] = useState(0);
  const [stake, setStake] = useState(1000);
  const [buyKey, setBuyKey] = useState(picks[0]?.key ?? "1-2-3");
  const [buyAmount, setBuyAmount] = useState(100);

  const save = () => {
    const bought = [{ key: buyKey, amount: buyAmount }];
    const hitBuy = bought.find((b) => b.key === resultKey);
    const returnAmount = hitBuy ? Math.floor((payout / 100) * hitBuy.amount) : 0;
    const result: RaceResult = {
      raceId: race.id,
      resultKey,
      payout,
      stake,
      bought,
      hit: !!hitBuy,
      returnAmount,
      profit: returnAmount - stake,
      savedAt: new Date().toISOString(),
    };
    onSave(result);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-lg font-black">結果入力・収支保存</h3>
      <div className="grid gap-3 md:grid-cols-5">
        <div><div className="label">確定3連単</div><input className="input" value={resultKey} onChange={(e)=>setResultKey(e.target.value)} /></div>
        <div><div className="label">払戻金 / 100円</div><input className="input" type="number" value={payout} onChange={(e)=>setPayout(Number(e.target.value))} /></div>
        <div><div className="label">投資額</div><input className="input" type="number" value={stake} onChange={(e)=>setStake(Number(e.target.value))} /></div>
        <div><div className="label">購入買い目</div><input className="input" value={buyKey} onChange={(e)=>setBuyKey(e.target.value)} /></div>
        <div><div className="label">購入金額</div><input className="input" type="number" value={buyAmount} onChange={(e)=>setBuyAmount(Number(e.target.value))} /></div>
      </div>
      <button className="btn btn-primary mt-4" onClick={save}>結果を保存</button>
    </div>
  );
}
