import { NextResponse } from 'next/server';
import { replacePredictionLogs } from '@/repositories/core/predictionRepository';
import { calculatePredictions } from '@/ai/predictor';
import { raceService } from '@/services/raceService';

export async function POST(req: Request) {
  const body = await req.json();
  const raceId = String(body.raceId ?? '');
  const modelId = body.modelId ? String(body.modelId) : undefined;

  const race = raceService.getRace(raceId);
  if (!race) {
    return NextResponse.json({ ok: false, error: 'race not found' }, { status: 404 });
  }

  const venue = raceService.getVenue(race.venueId);
  const predictions = calculatePredictions(race.entries, venue?.weather);
  const rows = await replacePredictionLogs({ raceId, modelId, predictions });

  return NextResponse.json({ ok: true, data: { count: rows.length } });
}
