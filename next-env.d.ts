import { Racer, Venue } from './types';

export const venues: Venue[] = [
  { id: 'hamanako', name: '浜名湖', area: '静岡', isOpenToday: true },
  { id: 'gamagori', name: '蒲郡', area: '愛知', isOpenToday: true },
  { id: 'tokoname', name: '常滑', area: '愛知', isOpenToday: true },
  { id: 'heiwajima', name: '平和島', area: '東京', isOpenToday: true },
  { id: 'toda', name: '戸田', area: '埼玉', isOpenToday: false },
  { id: 'kiryu', name: '桐生', area: '群馬', isOpenToday: false }
];

export const sampleRacers: Racer[] = [
  { lane: 1, name: '山田 太郎', className: 'A1', nationalWinRate: 6.8, localWinRate: 7.1, avgST: 0.14, motorRate: 42.3, boatRate: 35.1, exhibitionTime: 6.72, weight: 52.0 },
  { lane: 2, name: '鈴木 一郎', className: 'A2', nationalWinRate: 5.7, localWinRate: 5.5, avgST: 0.16, motorRate: 31.2, boatRate: 33.0, exhibitionTime: 6.78, weight: 53.5 },
  { lane: 3, name: '佐藤 健', className: 'B1', nationalWinRate: 4.9, localWinRate: 5.2, avgST: 0.15, motorRate: 38.9, boatRate: 29.5, exhibitionTime: 6.75, weight: 51.5 },
  { lane: 4, name: '高橋 誠', className: 'A2', nationalWinRate: 5.9, localWinRate: 4.8, avgST: 0.13, motorRate: 28.8, boatRate: 32.2, exhibitionTime: 6.81, weight: 54.0 },
  { lane: 5, name: '伊藤 翔', className: 'B1', nationalWinRate: 4.4, localWinRate: 4.2, avgST: 0.18, motorRate: 45.0, boatRate: 41.3, exhibitionTime: 6.80, weight: 52.8 },
  { lane: 6, name: '中村 亮', className: 'B2', nationalWinRate: 3.8, localWinRate: 3.6, avgST: 0.19, motorRate: 25.1, boatRate: 27.4, exhibitionTime: 6.86, weight: 55.0 }
];
