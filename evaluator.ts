export type TrainingSample = {
  raceId: string;
  features: number[];
  label: number;
};

export function buildDataset(rows: any[]): TrainingSample[] {
  return rows.map((row, index) => {
    const features = [
      Number(row.nationalWinRate ?? 0),
      Number(row.localWinRate ?? 0),
      Number(row.motorRate ?? 0),
      Number(row.boatRate ?? 0),
      Number(row.avgStart ?? 0),
      Number(row.exhibitionTime ?? 0),
      Number(row.windSpeed ?? 0),
      Number(row.waveHeight ?? 0)
    ];

    return {
      raceId: String(row.raceId ?? `sample-${index}`),
      features,
      label: Number(row.label ?? 0)
    };
  });
}
