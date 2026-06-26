import { NextRequest, NextResponse } from 'next/server';

function seeded(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export async function GET(req: NextRequest) {
  const venueId = req.nextUrl.searchParams.get('venueId') || 'hamanako';
  const raceNo = Number(req.nextUrl.searchParams.get('raceNo') || 1);
  const seed = venueId.split('').reduce((s, c) => s + c.charCodeAt(0), 0) + raceNo * 31;
  const nowHour = new Date().getHours();
  const isConfirmed = raceNo < Math.max(1, nowHour - 9);

  const lanes = [1, 2, 3, 4, 5, 6].sort((a, b) => seeded(seed + a) - seeded(seed + b));
  const [first, second, third] = lanes;

  return NextResponse.json({
    status: isConfirmed ? 'confirmed' : 'pending',
    first: isConfirmed ? first : undefined,
    second: isConfirmed ? second : undefined,
    third: isConfirmed ? third : undefined,
    combination: isConfirmed ? `${first}-${second}-${third}` : undefined,
    payout: isConfirmed ? Math.round((seeded(seed + 99) * 18000 + 900) / 100) * 100 : undefined,
    source: 'mock-api-v1 / 結果速報（後で実データへ差し替え）',
    updatedAt: new Date().toISOString()
  });
}
