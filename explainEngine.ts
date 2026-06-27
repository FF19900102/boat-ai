import { Entry, Race, Venue } from '@/lib/types';

export type BoatFeature = {
  lane: number;
  racerPower: number;
  localPower: number;
  motorPower: number;
  boatPower: number;
  startPower: number;
  exhibitionPower: number;
  lanePower: number;
  weatherPower: number;
  totalBase: number;
};

function lanePower(lane: number) {
  const map: Record<number, number> = { 1: 100, 2: 74, 3: 68, 4: 60, 5: 48, 6: 40 };
  return map[lane] ?? 40;
}

function weatherPower(entry: Entry, venue?: Venue) {
  if (!venue) return 50;

  let score = 50;
  const wind = venue.weather.windSpeed;
  const wave = venue.weather.waveHeight;

  if (wind >= 5 && entry.lane === 1) score -= 8;
  if (wind >= 5 && entry.lane >= 3) score += 4;
  if (wave >= 4 && entry.lane >= 5) score -= 6;
  if (wave <= 2 && entry.lane === 1) score += 4;

  return Math.max(20, Math.min(90, score));
}

export function buildBoatFeatures(race: Race, venue?: Venue): BoatFeature[] {
  return race.entries.map((entry) => {
    const racerPower = entry.nationalWinRate * 12;
    const localPower = entry.localWinRate * 8;
    const motorPower = entry.motorRate * 1.2;
    const boatPower = entry.boatRate * 0.7;
    const startPower = Math.max(0, (0.25 - entry.avgStart) * 420);
    const exhibitionPower = Math.max(0, (6.95 - entry.exhibitionTime) * 180);
    const lPower = lanePower(entry.lane);
    const wPower = weatherPower(entry, venue);

    return {
      lane: entry.lane,
      racerPower,
      localPower,
      motorPower,
      boatPower,
      startPower,
      exhibitionPower,
      lanePower: lPower,
      weatherPower: wPower,
      totalBase:
        racerPower +
        localPower +
        motorPower +
        boatPower +
        startPower +
        exhibitionPower +
        lPower +
        wPower
    };
  });
}
