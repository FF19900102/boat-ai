import { NextResponse } from 'next/server';
import { getLiveBoatDataProvider } from '@/services/providers/liveProviderFactory';

export async function GET() {
  try {
    const provider = getLiveBoatDataProvider();
    const data = await provider.getVenues();
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : 'failed to get live venues'
    }, { status: 500 });
  }
}
