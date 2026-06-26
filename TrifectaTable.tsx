import { NextResponse } from 'next/server';
import { raceService } from '@/services/raceService';

export async function GET() {
  return NextResponse.json(raceService.listVenues());
}
