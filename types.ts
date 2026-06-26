'use client';
import type { RaceMeta } from '@/services/boatDataClient';

type Props = {
  raceNo: number;
  races?: RaceMeta[];
  onSelect: (raceNo: number) => void;
};

export function RaceSelector({ raceNo, races, onSelect }: Props) {
  const list = races && races.length ? races : Array.from({ length: 12 }, (_, i) => ({
    venueId: '',
    raceNo: i + 1,
    status: 'before' as const,
    startTime: '',
    title: `${i + 1}R`
  }));

  return (
    <section className="card">
      <div className="section-title">
        <h2>レース選択</h2>
        <span className="small">12R対応</span>
      </div>
      <div className="grid grid-3">
        {list.map((race) => (
          <button key={race.raceNo} className={`race-button ${raceNo === race.raceNo ? 'active' : ''}`} onClick={() => onSelect(race.raceNo)}>
            <b>{race.raceNo}R</b>
            <span>{race.startTime || '--:--'}</span>
            <em>{race.status === 'closed' ? '終了' : race.status === 'open' ? '発売中' : '前'}</em>
          </button>
        ))}
      </div>
    </section>
  );
}
