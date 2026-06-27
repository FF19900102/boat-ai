export type FeatureMap = Record<string, number | string | boolean | null>;

export type FeatureRow = {
  raceId: string;
  lane: number;
  features: FeatureMap;
};

export function n(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}
