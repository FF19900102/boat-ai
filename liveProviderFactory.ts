import { NextResponse } from 'next/server';
import { getLiveBoatDataProvider } from '@/services/providers/liveProviderFactory';

export async function GET(_: Request, { params }: { params: { raceId: string } }) {
  try {
    const provider = getLiveBoatDataProvider();
    const data = await provider.getResult(params.raceId);

    if (!data) {
      return NextResponse.json({ ok: false, error: 'result not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : 'failed to get live result'
    }, { status: 500 });
  }
}
