import { NextResponse } from 'next/server';
import { raceService } from '@/services/raceService';

export async function GET(_: Request, { params }: { params: { raceId: string } }) {
  const race = raceService.getRace(params.raceId);
  if (!race) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(race);
}
