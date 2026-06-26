import { NextResponse } from 'next/server';
import { listPredictionLogs, savePredictionLog } from '@/repositories/predictionLogRepository';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raceId = searchParams.get('raceId') ?? undefined;

  try {
    const rows = await listPredictionLogs(raceId);
    return NextResponse.json({ ok: true, data: rows });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : 'failed to list prediction logs'
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.raceId || !Array.isArray(body.predictions)) {
      return NextResponse.json({
        ok: false,
        error: 'raceId and predictions required'
      }, { status: 400 });
    }

    const rows = await savePredictionLog(String(body.raceId), body.predictions);
    return NextResponse.json({ ok: true, data: { count: rows.length } });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : 'failed to save prediction logs'
    }, { status: 500 });
  }
}
