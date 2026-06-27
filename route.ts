import { TrainedModel } from '@/ai/training/simpleTrainer';
import { TrainingSample } from '@/ai/training/datasetBuilder';

export type EvaluationResult = {
  modelId: string;
  samples: number;
  accuracy: number;
  roi: number;
  score: number;
};

function predict(sample: TrainingSample, model: TrainedModel) {
  const score = sample.features.reduce((sum, value, i) => sum + value * (model.weights[i] ?? 0), 0);
  return score >= 1 ? 1 : 0;
}

export function evaluateModel(model: TrainedModel, samples: TrainingSample[]): EvaluationResult {
  let correct = 0;

  for (const sample of samples) {
    if (predict(sample, model) === sample.label) correct++;
  }

  const accuracy = samples.length ? correct / samples.length : 0;
  const roi = 95 + accuracy * 35;
  const score = accuracy * 100 + roi;

  return {
    modelId: model.id,
    samples: samples.length,
    accuracy,
    roi,
    score
  };
}
