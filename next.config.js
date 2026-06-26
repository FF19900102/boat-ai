import { Venue, Boat } from './types';
export const venues: Venue[] = [
  {id:'kiryu',name:'桐生',region:'関東',water:'淡水'}, {id:'toda',name:'戸田',region:'関東',water:'淡水'},
  {id:'edogawa',name:'江戸川',region:'関東',water:'汽水'}, {id:'heiwajima',name:'平和島',region:'関東',water:'海水'},
  {id:'tamagawa',name:'多摩川',region:'関東',water:'淡水'}, {id:'hamanako',name:'浜名湖',region:'東海',water:'汽水'},
  {id:'gamagori',name:'蒲郡',region:'東海',water:'海水'}, {id:'tokoname',name:'常滑',region:'東海',water:'海水'},
  {id:'tsu',name:'津',region:'東海',water:'海水'}, {id:'mikuni',name:'三国',region:'北陸',water:'淡水'},
  {id:'biwako',name:'びわこ',region:'近畿',water:'淡水'}, {id:'suminoe',name:'住之江',region:'近畿',water:'淡水'},
  {id:'amagasaki',name:'尼崎',region:'近畿',water:'淡水'}, {id:'naruto',name:'鳴門',region:'四国',water:'海水'},
  {id:'marugame',name:'丸亀',region:'四国',water:'海水'}, {id:'kojima',name:'児島',region:'中国',water:'海水'},
  {id:'miyajima',name:'宮島',region:'中国',water:'海水'}, {id:'tokuyama',name:'徳山',region:'中国',water:'海水'},
  {id:'shimonoseki',name:'下関',region:'中国',water:'海水'}, {id:'wakamatsu',name:'若松',region:'九州',water:'海水'},
  {id:'ashiya',name:'芦屋',region:'九州',water:'淡水'}, {id:'fukuoka',name:'福岡',region:'九州',water:'海水'},
  {id:'karatsu',name:'唐津',region:'九州',water:'淡水'}, {id:'omura',name:'大村',region:'九州',water:'海水'}
];
const names = ['山田太郎','鈴木一郎','佐藤健二','田中誠','加藤亮','伊藤翔','渡辺大輔','小林直樹','中村優','高橋蓮'];
export function makeBoats(seed=1): Boat[] {
  return Array.from({length:6},(_,i)=>({
    frame:i+1,
    name:names[(seed+i)%names.length],
    classRank:i===0?'A1':i<3?'A2':'B1',
    nationalRate: +(4.2 + ((seed+i*7)%30)/10).toFixed(2),
    localRate: +(4.0 + ((seed+i*5)%28)/10).toFixed(2),
    avgST: +(0.12 + ((seed+i*3)%12)/100).toFixed(2),
    motorRate: +(25 + ((seed+i*9)%45)).toFixed(1),
    boatRate: +(23 + ((seed+i*6)%42)).toFixed(1),
    exhibition: +(6.62 + ((seed+i*4)%28)/100).toFixed(2),
    tilt: i===5?0.5:0,
    weight: +(50 + ((seed+i*2)%8)).toFixed(1),
    course:i+1
  }));
}
