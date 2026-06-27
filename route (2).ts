import { TrainedModel } from '@/ai/training/simpleTrainer';
import { EvaluationResult } from '@/ai/evaluation/evaluator';

export type RegisteredModel = {
  model: TrainedModel;
  evaluation?: EvaluationResult;
  active: boolean;
};

const models: RegisteredModel[] = [];

export function registerModel(model: TrainedModel, evaluation?: EvaluationResult) {
  const row: RegisteredModel = {
    model,
    evaluation,
    active: models.length === 0
  };

  models.unshift(row);
  return row;
}

export function listModels() {
  return models;
}

export function setActiveModel(modelId: string) {
  for (const row of models) {
    row.active = row.model.id === modelId;
  }

  return models.find((row) => row.active) ?? null;
}

export function getActiveModel() {
  return models.find((row) => row.active) ?? null;
}
