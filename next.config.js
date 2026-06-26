import { Racer, Venue } from './types';
export const venues: Venue[] = [
 {id:'kiryu',name:'桐生',region:'関東',night:true},{id:'toda',name:'戸田',region:'関東'},{id:'edogawa',name:'江戸川',region:'関東'},
 {id:'heiwajima',name:'平和島',region:'関東'},{id:'tamagawa',name:'多摩川',region:'関東'},{id:'hamanako',name:'浜名湖',region:'東海'},
 {id:'gamagori',name:'蒲郡',region:'東海',night:true},{id:'tokoname',name:'常滑',region:'東海'},{id:'tsu',name:'津',region:'近畿'},
 {id:'mikuni',name:'三国',region:'北陸'},{id:'biwako',name:'びわこ',region:'近畿'},{id:'suminoe',name:'住之江',region:'近畿',night:true},
 {id:'amagasaki',name:'尼崎',region:'近畿'},{id:'naruto',name:'鳴門',region:'四国'},{id:'marugame',name:'丸亀',region:'四国',night:true},
 {id:'kojima',name:'児島',region:'中国'},{id:'miyajima',name:'宮島',region:'中国'},{id:'tokuyama',name:'徳山',region:'中国'},
 {id:'shimonoseki',name:'下関',region:'中国',night:true},{id:'wakamatsu',name:'若松',region:'九州',night:true},{id:'ashiya',name:'芦屋',region:'九州'},
 {id:'fukuoka',name:'福岡',region:'九州'},{id:'karatsu',name:'唐津',region:'九州'},{id:'omura',name:'大村',region:'九州',night:true}
];
export const defaultRacers: Racer[] = [
 {lane:1,name:'山田 太郎',className:'A1',nationalWin:6.9,localWin:7.1,avgSt:.13,motor2:42,boat2:36,exhibition:6.73,tilt:0,weight:52,entry:1},
 {lane:2,name:'佐藤 健',className:'A2',nationalWin:5.8,localWin:5.4,avgSt:.16,motor2:35,boat2:31,exhibition:6.78,tilt:0,weight:53,entry:2},
 {lane:3,name:'鈴木 誠',className:'B1',nationalWin:5.1,localWin:4.9,avgSt:.15,motor2:39,boat2:33,exhibition:6.76,tilt:0,weight:54,entry:3},
 {lane:4,name:'田中 翔',className:'A2',nationalWin:5.9,localWin:6.0,avgSt:.17,motor2:30,boat2:38,exhibition:6.81,tilt:0,weight:52,entry:4},
 {lane:5,name:'高橋 優',className:'B1',nationalWin:4.8,localWin:4.6,avgSt:.18,motor2:44,boat2:29,exhibition:6.79,tilt:.5,weight:51,entry:5},
 {lane:6,name:'伊藤 蓮',className:'B1',nationalWin:4.2,localWin:4.0,avgSt:.19,motor2:28,boat2:27,exhibition:6.85,tilt:0,weight:55,entry:6}
];
