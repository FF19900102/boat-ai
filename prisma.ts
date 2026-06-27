import { NextResponse } from 'next/server';
import { listDbRaces, upsertRaceToDb } from '@/repositories/core/raceRepository';
import { raceService } from '@/services/raceService';
import { replaceRaceEntries } from '@/repositories/core/entryRepository';

export async function GET() {
  const rows = await listDbRaces();
  return NextResponse.json({ ok: true, data: rows });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const raceId = String(body.raceId ?? 'hamanako-1');
  const race = raceService.getRace(raceId);

  if (!race) {
    return NextResponse.json({ ok: false, error: 'race not found' }, { status: 404 });
  }

  await upsertRaceToDb(race);
  await replaceRaceEntries(race.id, race.entries);

  return NextResponse.json({ ok: true, data: { raceId: race.id, entries: race.entries.length } });
}
