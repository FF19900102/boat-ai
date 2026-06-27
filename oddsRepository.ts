import { NextResponse } from 'next/server';
import { saveOddsSnapshot } from '@/repositories/core/oddsRepository';
import { raceService } from '@/services/raceService';

export async function POST(req: Request) {
  const body = await req.json();
  const raceId = String(body.raceId ?? '');
  const race = raceService.getRace(raceId);

  if (!race) {
    return NextResponse.json({ ok: false, error: 'race not found' }, { status: 404 });
  }

  const rows = await saveOddsSnapshot(race.id, race.odds);
  return NextResponse.json({ ok: true, data: { count: rows.length } });
}
