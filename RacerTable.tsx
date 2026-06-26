import { NextRequest, NextResponse } from 'next/server';
import { defaultRacers, defaultWeather } from '@/lib/sampleData';

const names = ['山田 太郎', '鈴木 一郎', '佐藤 次郎', '田中 三郎', '高橋 四郎', '伊藤 五郎', '中村 六郎', '渡辺 七海', '小林 大輔', '加藤 翔'];

function seeded(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export async function GET(req: NextRequest) {
  const venueId = req.nextUrl.searchParams.get('venueId') || 'hamanako';
  const raceNo = Number(req.nextUrl.searchParams.get('raceNo') || 1);
  const baseSeed = venueId.split('').reduce((s, c) => s + c.charCodeAt(0), 0) + raceNo * 17;

  const racers = defaultRacers.map((r, index) => {
    const s = baseSeed + index * 13;
    return {
      ...r,
      name: names[(s + index) % names.length],
      nationalWinRate: Number(Math.max(3.2, Math.min(7.8, r.nationalWinRate + (seeded(s) - 0.5) * 1.2)).toFixed(2)),
      localWinRate: Number(Math.max(2.8, Math.min(8.2, r.localWinRate + (seeded(s + 1) - 0.5) * 1.4)).toFixed(2)),
      avgStart: Number(Math.max(0.1, Math.min(0.24, r.avgStart + (seeded(s + 2) - 0.5) * 0.04)).toFixed(2)),
      motorRate: Number(Math.max(18, Math.min(55, r.motorRate + (seeded(s + 3) - 0.5) * 12)).toFixed(1)),
      boatRate: Number(Math.max(18, Math.min(55, r.boatRate + (seeded(s + 4) - 0.5) * 12)).toFixed(1)),
      exhibitionTime: Number(Math.max(6.55, Math.min(7.05, r.exhibitionTime + (seeded(s + 5) - 0.5) * 0.18)).toFixed(2)),
      oddsWin: Number(Math.max(1.2, Math.min(80, r.oddsWin + (seeded(s + 6) - 0.5) * 8)).toFixed(1))
    };
  });

  const windSpeed = Math.round(seeded(baseSeed + 100) * 8);
  const weather = {
    ...defaultWeather,
    weather: ['晴れ', '曇り', '雨'][Math.floor(seeded(baseSeed + 101) * 3)],
    windDirection: ['追い風', '向かい風', '横風'][Math.floor(seeded(baseSeed + 102) * 3)],
    windSpeed,
    waveHeight: Math.max(0, Math.round(windSpeed * 0.7))
  };

  return NextResponse.json({
    venueId,
    raceNo,
    source: 'mock-api-v1 / 出走表・展示・気象（後で実データへ差し替え）',
    updatedAt: new Date().toISOString(),
    racers,
    weather
  });
}
