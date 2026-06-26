import type { Racer, RaceWeather, Venue } from './types';

export const venues: Venue[] = [
  { id: 'kiryu', name: '桐生', region: '関東', night: true },
  { id: 'toda', name: '戸田', region: '関東' },
  { id: 'edogawa', name: '江戸川', region: '関東' },
  { id: 'heiwajima', name: '平和島', region: '関東' },
  { id: 'tamagawa', name: '多摩川', region: '関東' },
  { id: 'hamanako', name: '浜名湖', region: '東海' },
  { id: 'gamagori', name: '蒲郡', region: '東海', night: true },
  { id: 'tokoname', name: '常滑', region: '東海' },
  { id: 'tsu', name: '津', region: '東海' },
  { id: 'mikuni', name: '三国', region: '北陸' },
  { id: 'biwako', name: 'びわこ', region: '近畿' },
  { id: 'suminoe', name: '住之江', region: '近畿', night: true },
  { id: 'amagasaki', name: '尼崎', region: '近畿' },
  { id: 'naruto', name: '鳴門', region: '四国' },
  { id: 'marugame', name: '丸亀', region: '四国', night: true },
  { id: 'kojima', name: '児島', region: '中国' },
  { id: 'miyajima', name: '宮島', region: '中国' },
  { id: 'tokuyama', name: '徳山', region: '中国' },
  { id: 'shimonoseki', name: '下関', region: '中国', night: true },
  { id: 'wakamatsu', name: '若松', region: '九州', night: true },
  { id: 'ashiya', name: '芦屋', region: '九州' },
  { id: 'fukuoka', name: '福岡', region: '九州' },
  { id: 'karatsu', name: '唐津', region: '九州' },
  { id: 'omura', name: '大村', region: '九州', night: true }
];

export const defaultRacers: Racer[] = [
  { lane: 1, name: '山田 太郎', className: 'A1', nationalWinRate: 6.8, localWinRate: 7.1, avgStart: 0.14, motorRate: 41.2, boatRate: 37.5, exhibitionTime: 6.72, tilt: -0.5, weight: 52.0, oddsWin: 2.1 },
  { lane: 2, name: '鈴木 一郎', className: 'A2', nationalWinRate: 5.9, localWinRate: 5.6, avgStart: 0.16, motorRate: 34.8, boatRate: 31.2, exhibitionTime: 6.78, tilt: -0.5, weight: 53.1, oddsWin: 7.8 },
  { lane: 3, name: '佐藤 次郎', className: 'A1', nationalWinRate: 6.3, localWinRate: 6.0, avgStart: 0.13, motorRate: 39.1, boatRate: 35.2, exhibitionTime: 6.74, tilt: 0, weight: 52.4, oddsWin: 5.4 },
  { lane: 4, name: '田中 三郎', className: 'B1', nationalWinRate: 4.8, localWinRate: 4.9, avgStart: 0.18, motorRate: 29.7, boatRate: 28.3, exhibitionTime: 6.84, tilt: 0, weight: 54.0, oddsWin: 18.2 },
  { lane: 5, name: '高橋 四郎', className: 'A2', nationalWinRate: 5.4, localWinRate: 5.1, avgStart: 0.15, motorRate: 32.5, boatRate: 33.0, exhibitionTime: 6.81, tilt: 0.5, weight: 52.8, oddsWin: 22.5 },
  { lane: 6, name: '伊藤 五郎', className: 'B1', nationalWinRate: 4.2, localWinRate: 4.0, avgStart: 0.19, motorRate: 27.1, boatRate: 25.9, exhibitionTime: 6.89, tilt: 0.5, weight: 55.2, oddsWin: 48.0 }
];

export const defaultWeather: RaceWeather = {
  weather: '晴れ',
  windDirection: '向かい風',
  windSpeed: 3,
  waveHeight: 2
};
