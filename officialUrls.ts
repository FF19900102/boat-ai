import { NextResponse } from 'next/server';
import { getOfficialRaceCard } from '@/services/official/officialDataService';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const venueId = searchParams.get('venueId') ?? 'hamanako';
    const raceNo = Number(searchParams.get('raceNo') ?? 1);
    const yyyymmdd = searchParams.get('date') ?? undefined;

    const data = await getOfficialRaceCard({ venueId, raceNo, yyyymmdd });
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : 'official race fetch failed'
    }, { status: 500 });
  }
}
