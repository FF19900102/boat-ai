import { NextResponse } from 'next/server';
import { getAiLeague } from '@/services/aiLeagueService';

export async function GET() {
  try {
    const result = await getAiLeague();
    return NextResponse.json({ ok: true, data: result });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : 'failed to get ai league'
    }, { status: 500 });
  }
}
