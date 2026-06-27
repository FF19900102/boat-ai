import { NextResponse } from 'next/server';
import { importRaceBatch } from '@/services/importer/importRaceService';

export async function POST() {
  return NextResponse.json({ ok:true, data: await importRaceBatch() });
}
