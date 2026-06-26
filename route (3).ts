import { NextResponse } from 'next/server';
import { getBoatDataProvider } from '@/services/dataProviderFactory';

export async function GET() {
  const provider = getBoatDataProvider();
  const venues = await provider.getVenues();
  return NextResponse.json({ ok: true, data: venues });
}
