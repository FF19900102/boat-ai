import { BoatFeature } from '@/ai/features/featureEngine';
import { Prediction, TrifectaPrediction } from '@/lib/types';
import { AiModelProfile } from '@/ai/models/modelProfiles';

export function explainPrediction(input: {
  model: AiModelProfile;
  features: BoatFeature[];
  predictions: Prediction[];
  trifecta: TrifectaPrediction[];
}) {
  const top = input.predictions[0];
  const topFeature = input.features.find((f) => f.lane === top?.lane);
  const bestBet = input.trifecta[0];

  const reasons: string[] = [];

  if (topFeature) {
    const factors = [
      ['選手力', topFeature.racerPower],
      ['当地相性', topFeature.localPower],
      ['モーター', topFeature.motorPower],
      ['展示', topFeature.exhibitionPower],
      ['枠番', topFeature.lanePower],
      ['気象', topFeature.weatherPower]
    ].sort((a, b) => Number(b[1]) - Number(a[1]));

    reasons.push(`${top.lane}号艇は「${factors[0][0]}」と「${factors[1][0]}」の評価が高いです。`);
  }

  if (bestBet) {
    reasons.push(`最上位買い目は ${bestBet.combination}、期待値は ${bestBet.expectedValue.toFixed(1)} です。`);
  }

  reasons.push(`使用モデルは「${input.model.name}」です。${input.model.description}`);

  return {
    summary: reasons.join(' '),
    topLane: top?.lane ?? null,
    topBet: bestBet ?? null,
    reasons
  };
}
