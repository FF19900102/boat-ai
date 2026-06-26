export function RaceSelector({ selectedRace, onSelect }: {
  selectedRace: number;
  onSelect: (race: number) => void;
}) {
  return (
    <div className="raceGrid">
      {Array.from({ length: 12 }, (_, i) => i + 1).map((race) => (
        <button
          key={race}
          className={selectedRace === race ? 'race active' : 'race'}
          onClick={() => onSelect(race)}
        >
          {race}R
        </button>
      ))}
    </div>
  );
}
