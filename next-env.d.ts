export type Venue = {
  id: string;
  name: string;
  region: string;
  isOpenToday: boolean;
  weather: string;
  wind: string;
};

export type Race = {
  id: string;
  venueId: string;
  raceNo: number;
  title: string;
  deadline: string;
  status: "before" | "live" | "finished";
};
