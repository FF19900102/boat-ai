import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const venueId = req.nextUrl.searchParams.get('venueId') || 'hamanako';
  const nowHour = new Date().getHours();
  const races = Array.from({ length: 12 }, (_, i) => {
    const raceNo = i + 1;
    const hour = 10 + Math.floor(i * 0.6);
    const minute = (i % 2) * 30;
    return {
      venueId,
      raceNo,
      status: raceNo < Math.max(1, nowHour - 9) ? 'closed' : raceNo === Math.max(1, nowHour - 9) ? 'open' : 'before',
      startTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      title: `${raceNo}R 予選`
    };
  });

  return NextResponse.json({
    races,
    source: 'mock-api-v1 / レース一覧',
    updatedAt: new Date().toISOString()
  });
}
