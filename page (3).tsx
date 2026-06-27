import { NextResponse } from 'next/server';
import { getOddsTrend } from '@/services/oddsTrendService';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raceId = searchParams.get('raceId') ?? 'hamanako-1';
  const trend = getOddsTrend(raceId);

  if (!trend) {
    return NextResponse.json({ ok: false, error: 'race not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: trend });
}
