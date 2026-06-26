import type { Race, Venue } from "./types";

export const venues: Venue[] = [
  { id: "hamanako", name: "浜名湖", region: "東海", isOpenToday: true, weather: "晴", wind: "西 3m" },
  { id: "gamagori", name: "蒲郡", region: "東海", isOpenToday: true, weather: "曇", wind: "南 2m" },
  { id: "tokoname", name: "常滑", region: "東海", isOpenToday: true, weather: "晴", wind: "北西 4m" },
  { id: "heiwajima", name: "平和島", region: "関東", isOpenToday: true, weather: "曇", wind: "北 5m" },
  { id: "toda", name: "戸田", region: "関東", isOpenToday: false, weather: "-", wind: "-" },
  { id: "kiryu", name: "桐生", region: "関東", isOpenToday: true, weather: "晴", wind: "東 1m" }
];

export function racesByVenue(venueId: string): Race[] {
  return Array.from({ length: 12 }, (_, i) => ({
    id: `${venueId}-${i + 1}`,
    venueId,
    raceNo: i + 1,
    title: i < 4 ? "予選" : i < 10 ? "一般戦" : "選抜戦",
    deadline: `${10 + Math.floor(i / 2)}:${i % 2 === 0 ? "35" : "05"}`,
    status: "before"
  }));
}

export function getVenue(id: string) {
  return venues.find((venue) => venue.id === id);
}
