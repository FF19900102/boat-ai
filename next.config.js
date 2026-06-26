import { Venue, BoatEntry } from "./types";
export const venues: Venue[] = [
  { id:"kiryu", name:"桐生", region:"関東", water:"淡水", active:true },
  { id:"toda", name:"戸田", region:"関東", water:"淡水", active:true },
  { id:"edogawa", name:"江戸川", region:"関東", water:"河川", active:false },
  { id:"heiwajima", name:"平和島", region:"関東", water:"海水", active:true },
  { id:"tamagawa", name:"多摩川", region:"関東", water:"淡水", active:true },
  { id:"hamanako", name:"浜名湖", region:"東海", water:"汽水", active:true },
  { id:"gamagori", name:"蒲郡", region:"東海", water:"海水", active:true },
  { id:"tokoname", name:"常滑", region:"東海", water:"海水", active:true },
  { id:"tsu", name:"津", region:"近畿", water:"海水", active:false },
  { id:"mikuni", name:"三国", region:"北陸", water:"淡水", active:true },
  { id:"biwako", name:"びわこ", region:"近畿", water:"淡水", active:true },
  { id:"suminoe", name:"住之江", region:"近畿", water:"淡水", active:true },
  { id:"marugame", name:"丸亀", region:"四国", water:"海水", active:true },
  { id:"kojima", name:"児島", region:"中国", water:"海水", active:false },
  { id:"miyajima", name:"宮島", region:"中国", water:"海水", active:true },
  { id:"tokuyama", name:"徳山", region:"中国", water:"海水", active:true },
  { id:"shimonoseki", name:"下関", region:"中国", water:"海水", active:true },
  { id:"wakamatsu", name:"若松", region:"九州", water:"海水", active:true },
  { id:"ashiya", name:"芦屋", region:"九州", water:"淡水", active:false },
  { id:"fukuoka", name:"福岡", region:"九州", water:"海水", active:true },
  { id:"karatsu", name:"唐津", region:"九州", water:"淡水", active:true },
  { id:"omura", name:"大村", region:"九州", water:"海水", active:true }
];
const names = ["山田太郎","鈴木一真","佐藤亮","田中誠","高橋翔","伊藤健","渡辺航","中村優","小林蓮","加藤大輔","吉田司","山本陸"];
export function makeEntries(venueId: string, raceNo: number): BoatEntry[] {
  const base = venueId.length + raceNo;
  return Array.from({ length: 6 }, (_, i) => {
    const lane = i + 1;
    const seed = base * (lane + 3);
    return {
      lane,
      name: names[(seed + i) % names.length],
      grade: ["A1","A2","B1","B2"][(seed + lane) % 4],
      nationalWinRate: +(4.2 + ((seed * 7) % 32) / 10).toFixed(2),
      localWinRate: +(3.8 + ((seed * 5) % 35) / 10).toFixed(2),
      avgST: +(0.11 + ((seed * 3) % 13) / 100).toFixed(2),
      motorRate: +(22 + ((seed * 11) % 29)).toFixed(1),
      boatRate: +(20 + ((seed * 13) % 32)).toFixed(1),
      exhibitionTime: +(6.68 + ((seed * 2) % 25) / 100).toFixed(2),
      tilt: [-0.5,0,0.5,1][(seed + i) % 4],
      weight: +(50 + ((seed * 7) % 80) / 10).toFixed(1),
      course: lane
    };
  });
}
