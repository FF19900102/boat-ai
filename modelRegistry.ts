import { TrainingSample } from '@/ai/training/datasetBuilder';

export type TrainedModel = {
  id: string;
  name: string;
  version: string;
  weights: number[];
  trainedAt: string;
  samples: number;
};

export function trainSimpleModel(samples: TrainingSample[]): TrainedModel {
  const featureCount = samples[0]?.features.length ?? 8;
  const weights = Array.from({ length: featureCount }).map((_, i) => {
    const avg =
      samples.reduce((sum, sample) => sum + (sample.features[i] ?? 0), 0) /
      Math.max(samples.length, 1);

    return Number((avg / 100).toFixed(4));
  });

  return {
    id: crypto.randomUUID(),
    name: 'BoatAI Simple Model',
    version: `simple-${Date.now()}`,
    weights,
    trainedAt: new Date().toISOString(),
    samples: samples.length
  };
}
