import { NextResponse } from 'next/server';
import { getBoatDataProvider } from '@/services/dataProviderFactory';

export async function GET(_: Request, { params }: { params: { raceId: string } }) {
  const provider = getBoatDataProvider();
  const result = await provider.getResult(params.raceId);

  if (!result) {
    return NextResponse.json({ ok: false, error: 'result not available yet' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: result });
}
