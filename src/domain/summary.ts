import {
  formatDistanceKm,
  formatDuration,
  formatPace,
  paceSecPerKm,
  type Sport,
  type Workout,
} from "./workout";

export interface WorkoutSummary {
  count: number;
  runKm: number;
  rideKm: number;
  movingSec: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function summarise(workouts: Workout[]): WorkoutSummary {
  let runM = 0;
  let rideM = 0;
  let movingSec = 0;
  for (const w of workouts) {
    movingSec += w.movingSec;
    if (w.sport === "run") runM += w.distanceM ?? 0;
    if (w.sport === "ride") rideM += w.distanceM ?? 0;
  }
  return {
    count: workouts.length,
    runKm: round1(runM / 1000),
    rideKm: round1(rideM / 1000),
    movingSec,
  };
}

/** One line of the history list: what a reader scans. */
export interface WorkoutRow {
  id: string;
  sport: Sport;
  day: string;
  date: string;
  name: string;
  meta: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function speedKmh(distanceM: number, movingSec: number): string {
  return `${round1(distanceM / 1000 / (movingSec / 3600)).toFixed(1)} km/h`;
}

export function toWorkoutRow(w: Workout): WorkoutRow {
  // startLocal has no zone; read it as UTC so the calendar fields are local.
  const local = new Date(`${w.startLocal}Z`);
  const parts: string[] = [];
  if (w.distanceM) parts.push(formatDistanceKm(w.distanceM));
  parts.push(formatDuration(w.movingSec));
  if (w.distanceM && w.sport === "run") {
    parts.push(`${formatPace(paceSecPerKm(w.distanceM, w.movingSec))} /km`);
  } else if (w.distanceM && w.sport === "ride") {
    parts.push(speedKmh(w.distanceM, w.movingSec));
  }
  if (w.avgHr != null) parts.push(`HR ${w.avgHr}`);
  return {
    id: w.id,
    sport: w.sport,
    day: DAYS[local.getUTCDay()],
    date: `${local.getUTCDate()} ${MONTHS[local.getUTCMonth()]}`,
    name: w.name,
    meta: parts.join(" · "),
  };
}
