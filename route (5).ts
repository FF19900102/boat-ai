import { NextResponse } from 'next/server';
import { getBoatDataProvider } from '@/services/dataProviderFactory';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const venueId = searchParams.get('venueId');

  if (!venueId) {
    return NextResponse.json({ ok: false, error: 'venueId is required' }, { status: 400 });
  }

  const provider = getBoatDataProvider();
  const races = await provider.getRaces(venueId);
  return NextResponse.json({ ok: true, data: races });
}
