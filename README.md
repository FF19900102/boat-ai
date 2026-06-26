import { Race, Venue } from "./types";

export const venues: Venue[] = [
  { id: "kiryu", name: "桐生", area: "関東", today: true },
  { id: "toda", name: "戸田", area: "関東", today: true },
  { id: "edogawa", name: "江戸川", area: "関東", today: false },
  { id: "heiwajima", name: "平和島", area: "関東", today: true },
  { id: "hamanako", name: "浜名湖", area: "東海", today: true },
  { id: "gamagori", name: "蒲郡", area: "東海", today: true },
  { id: "tokoname", name: "常滑", area: "東海", today: false },
  { id: "tsu", name: "津", area: "近畿", today: true },
  { id: "suminoe", name: "住之江", area: "近畿", today: true },
  { id: "marugame", name: "丸亀", area: "四国", today: false },
  { id: "fukuoka", name: "福岡", area: "九州", today: true },
  { id: "omura", name: "大村", area: "九州", today: true }
];

const baseNames = ["山田 太郎", "鈴木 一郎", "佐藤 健", "田中 誠", "伊藤 翔", "加藤 大輔"];

function makeRace(venueId: string, raceNo: number): Race {
  return {
    venueId,
    raceNo,
    title: raceNo <= 4 ? "予選" : raceNo <= 8 ? "一般" : "特選",
    deadline: `${String(10 + Math.floor(raceNo / 2)).padStart(2, "0")}:${raceNo % 2 === 0 ? "35" : "08"}`,
    wind: (raceNo % 6) + 1,
    wave: raceNo % 4,
    racers: Array.from({ length: 6 }).map((_, i) => ({
      lane: i + 1,
      name: baseNames[i],
      className: i === 0 ? "A1" : i < 3 ? "A2" : "B1",
      nationalRate: Number((6.8 - i * 0.35 + raceNo * 0.03).toFixed(2)),
      localRate: Number((6.4 - i * 0.28 + raceNo * 0.02).toFixed(2)),
      avgST: Number((0.13 + i * 0.012).toFixed(2)),
      motorRate: 42 - i * 3 + raceNo,
      boatRate: 38 - i * 2 + raceNo,
      exhibition: Number((6.72 + i * 0.03 - raceNo * 0.002).toFixed(2)),
      tilt: i === 5 ? 0.5 : 0,
      weight: 51 + i * 1.2
    }))
  };
}

export function getTodayVenues() {
  return venues.filter((v) => v.today);
}

export function getVenue(id: string) {
  return venues.find((v) => v.id === id);
}

export function getRacesByVenue(venueId: string) {
  return Array.from({ length: 12 }).map((_, i) => makeRace(venueId, i + 1));
}

export function getRace(venueId: string, raceNo: number) {
  return makeRace(venueId, raceNo);
}
