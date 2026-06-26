import { NextResponse } from 'next/server';
import { listOddsHistory, saveOddsHistory } from '@/repositories/oddsHistoryRepository';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raceId = searchParams.get('raceId') ?? undefined;

  try {
    const rows = await listOddsHistory(raceId);
    return NextResponse.json({ ok: true, data: rows });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : 'failed to list odds history'
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.raceId || !body.odds) {
      return NextResponse.json({
        ok: false,
        error: 'raceId and odds required'
      }, { status: 400 });
    }

    const rows = await saveOddsHistory(String(body.raceId), body.odds);
    return NextResponse.json({ ok: true, data: { count: rows.length } });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : 'failed to save odds history'
    }, { status: 500 });
  }
}
