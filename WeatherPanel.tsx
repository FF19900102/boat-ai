'use client';

export function RaceSelector({ raceNo, onSelect }: { raceNo: number; onSelect: (raceNo: number) => void }) {
  return (
    <section className="card">
      <h2>レース選択</h2>
      <div className="grid grid-3">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((no) => (
          <button key={no} className={`race-button ${raceNo === no ? 'active' : ''}`} onClick={() => onSelect(no)}>
            {no}R
          </button>
        ))}
      </div>
    </section>
  );
}
