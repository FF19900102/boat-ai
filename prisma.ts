import { NextResponse } from 'next/server';
import { createBetRecord, listBetRecords, clearBetRecords } from '@/repositories/betRepository';

export async function GET() {
  const rows = await listBetRecords();
  return NextResponse.json({ ok: true, data: rows });
}

export async function POST(req: Request) {
  const body = await req.json();

  const record = await createBetRecord({
    raceId: String(body.raceId ?? ''),
    venueName: String(body.venueName ?? ''),
    raceTitle: String(body.raceTitle ?? ''),
    combination: String(body.combination ?? ''),
    stake: Number(body.stake ?? 0),
    payout: Number(body.payout ?? 0),
    hit: Boolean(body.hit ?? Number(body.payout ?? 0) > 0)
  });

  return NextResponse.json({ ok: true, data: record });
}

export async function DELETE() {
  const count = await clearBetRecords();
  return NextResponse.json({ ok: true, data: { deleted: count } });
}
