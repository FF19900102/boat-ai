import { Venue, Racer, Weather } from './types';

export const venues: Venue[] = [
  { id:'01', name:'桐生', area:'群馬', status:'ナイター' },{ id:'02', name:'戸田', area:'埼玉', status:'開催' },
  { id:'03', name:'江戸川', area:'東京', status:'開催' },{ id:'04', name:'平和島', area:'東京', status:'開催' },
  { id:'05', name:'多摩川', area:'東京', status:'開催' },{ id:'06', name:'浜名湖', area:'静岡', status:'開催' },
  { id:'07', name:'蒲郡', area:'愛知', status:'ナイター' },{ id:'08', name:'常滑', area:'愛知', status:'開催' },
  { id:'09', name:'津', area:'三重', status:'開催' },{ id:'10', name:'三国', area:'福井', status:'モーニング' },
  { id:'11', name:'びわこ', area:'滋賀', status:'開催' },{ id:'12', name:'住之江', area:'大阪', status:'ナイター' }
];

const names = ['山田 太郎','鈴木 一成','田中 翔','佐藤 健','高橋 誠','伊藤 大輔','加藤 翼','中村 亮','小林 優','渡辺 航'];
export function makeRacers(seed:number): Racer[] {
  return Array.from({length:6},(_,i)=>({
    lane:i+1,
    name:names[(seed+i)%names.length],
    className:['A1','A2','B1','B1','A2','B2'][(seed+i)%6],
    nationalWin:Number((4.2+(((seed+i*7)%28)/10)).toFixed(2)),
    localWin:Number((3.8+(((seed+i*5)%32)/10)).toFixed(2)),
    st:Number((0.11+(((seed+i*3)%12)/100)).toFixed(2)),
    motorRate:Number((24+((seed+i*11)%44)).toFixed(1)),
    boatRate:Number((22+((seed+i*13)%42)).toFixed(1)),
    exhibition:Number((6.60+(((seed+i*4)%23)/100)).toFixed(2)),
    tilt:[-0.5,0,0,0,0.5,1][(seed+i)%6],
    weight:Number((50+((seed+i*2)%8)).toFixed(1)),
    entry:i+1
  }));
}
export const defaultWeather: Weather = { weather:'晴れ', windDir:'向かい風', windSpeed:2, wave:2 };
