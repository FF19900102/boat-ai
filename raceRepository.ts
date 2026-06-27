import { NextResponse } from 'next/server';
import { upsertRaceResult } from '@/repositories/core/resultRepository';

export async function POST(req: Request) {
  const body = await req.json();

  if (!body.raceId || !body.trifecta) {
    return NextResponse.json({ ok: false, error: 'raceId and trifecta required' }, { status: 400 });
  }

  const row = await upsertRaceResult({
    raceId: String(body.raceId),
    trifecta: String(body.trifecta),
    payout: Number(body.payout ?? 0)
  });

  return NextResponse.json({ ok: true, data: row });
}
