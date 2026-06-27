import { NextResponse } from 'next/server';
import { getLiveBoatDataProvider } from '@/services/providers/liveProviderFactory';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const venueId = searchParams.get('venueId');

    if (!venueId) {
      return NextResponse.json({ ok: false, error: 'venueId required' }, { status: 400 });
    }

    const provider = getLiveBoatDataProvider();
    const data = await provider.getRaces(venueId);
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : 'failed to get live races'
    }, { status: 500 });
  }
}
