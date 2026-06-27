import { TrifectaPrediction } from '@/lib/types';
import { AiModelProfile } from '@/ai/models/modelProfiles';

export function adjustExpectedValue(rows: TrifectaPrediction[], model: AiModelProfile) {
  return rows.map((row) => {
    let multiplier = 1;

    if (model.riskMode === 'safe') {
      if (row.odds <= 25) multiplier += 0.08;
      if (row.odds >= 80) multiplier -= 0.12;
    }

    if (model.riskMode === 'aggressive') {
      if (row.odds >= 35) multiplier += 0.12;
      if (row.odds >= 80) multiplier += 0.08;
    }

    if (model.riskMode === 'balanced') {
      if (row.odds >= 18 && row.odds <= 60) multiplier += 0.06;
    }

    const expectedValue = row.expectedValue * multiplier;

    return {
      ...row,
      expectedValue,
      judgment: expectedValue >= 125 ? 'buy' : expectedValue >= 100 ? 'watch' : 'skip'
    } satisfies TrifectaPrediction;
  }).sort((a, b) => b.expectedValue - a.expectedValue);
}
