import { NextResponse } from 'next/server';
import { getStatsSummary, getVenueStats } from '@/repositories/statsRepository';

export async function GET() {
  try {
    const summary = await getStatsSummary();
    const venues = await getVenueStats();

    return NextResponse.json({
      ok: true,
      data: {
        summary,
        venues
      }
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : 'failed to get stats'
    }, { status: 500 });
  }
}
