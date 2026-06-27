import { buildBoatFeatures } from '@/ai/features/featureEngine';
import { explainPrediction } from '@/ai/explain/explainEngine';
import { getAiModelProfile } from '@/ai/models/modelProfiles';
import { adjustExpectedValue } from '@/ai/value/valueEngine';
import { calculatePredictions, buildTrifectaRanking } from '@/ai/predictor';
import { Race, Venue } from '@/lib/types';

export function runAdvancedPrediction(input: {
  race: Race;
  venue?: Venue;
  modelId?: string;
}) {
  const model = getAiModelProfile(input.modelId);
  const features = buildBoatFeatures(input.race, input.venue);
  const predictions = calculatePredictions(input.race.entries, input.venue?.weather, model.weights);
  const baseTrifecta = buildTrifectaRanking(predictions, input.race.odds);
  const trifecta = adjustExpectedValue(baseTrifecta, model);
  const explanation = explainPrediction({
    model,
    features,
    predictions,
    trifecta
  });

  return {
    model,
    features,
    predictions,
    trifecta,
    explanation
  };
}
