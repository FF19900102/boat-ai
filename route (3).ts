import { NextResponse } from 'next/server';
import { createBetRecord, listBetRecords, clearBetRecords } from '@/repositories/betRepository';

export async function GET() {
  try {
    const rows = await listBetRecords();
    return NextResponse.json({ ok: true, data: rows });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : 'failed to list bet records'
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
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
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : 'failed to create bet record'
    }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const count = await clearBetRecords();
    return NextResponse.json({ ok: true, data: { deleted: count } });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : 'failed to clear bet records'
    }, { status: 500 });
  }
}
