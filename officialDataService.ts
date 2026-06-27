import { NextResponse } from 'next/server';
import { parseRaceId } from '@/services/parsers/raceId';
import { getOfficialResult } from '@/services/official/officialDataService';

export async function GET(req: Request, { params }: { params: { raceId: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const yyyymmdd = searchParams.get('date') ?? undefined;
    const parsed = parseRaceId(params.raceId);

    const data = await getOfficialResult({
      raceId: params.raceId,
      venueId: parsed.venueId,
      raceNo: parsed.raceNo,
      yyyymmdd
    });

    return NextResponse.json({ ok: true, data });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : 'official result fetch failed'
    }, { status: 500 });
  }
}
