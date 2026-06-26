'use client';

export function RaceSelector({ selected, onSelect }: { selected: number; onSelect: (raceNo: number) => void }) {
  return (
    <div className="grid race-grid">
      {Array.from({ length: 12 }, (_, i) => i + 1).map((r) => (
        <button key={r} className={`btn secondary ${selected === r ? 'active' : ''}`} onClick={() => onSelect(r)}>{r}R</button>
      ))}
    </div>
  );
}
