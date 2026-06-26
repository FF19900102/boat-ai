import { Boat, Venue } from './types';

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

export function createDefaultBoats(): Boat[] {
  return Array.from({ length: 6 }, (_, i) => ({
    frame: i + 1,
    name: `選手${i + 1}`,
    className: i === 0 ? 'A1' : i < 3 ? 'A2' : 'B1',
    nationalRate: [6.8, 5.9, 5.6, 5.1, 4.8, 4.2][i],
    localRate: [6.4, 5.5, 5.8, 4.9, 4.5, 4.0][i],
    avgSt: [0.14, 0.16, 0.15, 0.18, 0.17, 0.19][i],
    motorRate: [42, 36, 39, 31, 28, 25][i],
    boatRate: [38, 33, 34, 29, 30, 24][i],
    exhibition: [6.72, 6.79, 6.76, 6.84, 6.81, 6.88][i],
    tilt: 0,
    weight: [52, 53, 52, 54, 53, 55][i],
    course: i + 1
  }));
}
