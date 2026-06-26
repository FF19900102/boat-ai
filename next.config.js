import { Boat, Venue, Weather } from './types';

export const venues: Venue[] = [
  { id: 'kiryu', name: '桐生', region: '関東', night: true },
  { id: 'toda', name: '戸田', region: '関東' },
  { id: 'edogawa', name: '江戸川', region: '関東' },
  { id: 'heiwajima', name: '平和島', region: '関東' },
  { id: 'tamagawa', name: '多摩川', region: '関東' },
  { id: 'hamanako', name: '浜名湖', region: '東海' },
  { id: 'gamagori', name: '蒲郡', region: '東海', night: true },
  { id: 'tokoname', name: '常滑', region: '東海' },
  { id: 'tsu', name: '津', region: '近畿' },
  { id: 'mikuni', name: '三国', region: '北陸' },
  { id: 'biwako', name: 'びわこ', region: '近畿' },
  { id: 'suminoe', name: '住之江', region: '近畿', night: true },
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

export const todayVenueIds = ['hamanako', 'gamagori', 'tokoname', 'suminoe', 'marugame', 'omura', 'heiwajima', 'toda'];

const names = ['山田 太郎', '鈴木 一郎', '田中 誠', '佐藤 翔', '加藤 翼', '中村 海'];

export function defaultBoats(seed = 1): Boat[] {
  return Array.from({ length: 6 }).map((_, i) => ({
    frame: i + 1,
    name: names[i],
    class: i === 0 ? 'A1' : i < 3 ? 'A2' : 'B1',
    nationalRate: +(6.8 - i * 0.35 + seed * 0.03).toFixed(2),
    localRate: +(6.3 - i * 0.22 + seed * 0.02).toFixed(2),
    avgST: +(0.13 + i * 0.012).toFixed(2),
    motorRate: +(42 - i * 2 + seed).toFixed(1),
    boatRate: +(36 - i * 1.5 + seed * 0.4).toFixed(1),
    exhibition: +(6.72 + i * 0.03).toFixed(2),
    tilt: 0,
    weight: +(52 + i * 0.8).toFixed(1),
    course: i + 1
  }));
}

export const defaultWeather: Weather = { condition: '晴', windDirection: '向かい風', windSpeed: 2, wave: 2 };
