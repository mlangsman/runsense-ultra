import type { Sport, Workout } from "@/src/domain/workout";

/** The subset of an intervals.icu activity we read. Everything else is ignored. */
export interface IntervalsActivity {
  id: string;
  type: string;
  name?: string | null;
  start_date_local: string;
  start_date: string;
  timezone?: string | null;
  distance?: number | null;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain?: number | null;
  average_heartrate?: number | null;
  max_heartrate?: number | null;
  icu_training_load?: number | null;
  average_cadence?: number | null;
}

const SPORTS: Record<string, Sport> = {
  Run: "run",
  TrailRun: "run",
  VirtualRun: "run",
  Ride: "ride",
  VirtualRide: "ride",
  GravelRide: "ride",
  MountainBikeRide: "ride",
  EBikeRide: "ride",
  Swim: "swim",
  OpenWaterSwim: "swim",
  WeightTraining: "strength",
  Workout: "strength",
  Walk: "walk",
  Hike: "walk",
};

export function toSport(type: string): Sport {
  return SPORTS[type] ?? "other";
}

/**
 * intervals.icu often omits the timezone name. The local and UTC start times
 * are always present, so the offset can be derived from their difference.
 */
export function utcOffset(startLocal: string, startUtc: string): string {
  const local = Date.parse(`${startLocal}Z`);
  const utc = Date.parse(startUtc);
  const minutes = Math.round((local - utc) / 60_000);
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${sign}${hh}:${mm}`;
}

const numberOrNull = (v: number | null | undefined): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

export function toWorkout(a: IntervalsActivity): Workout {
  const sport = toSport(a.type);
  const cadence = numberOrNull(a.average_cadence);
  return {
    id: a.id,
    sport,
    name: a.name?.trim() || a.type,
    startLocal: a.start_date_local,
    timezone: a.timezone ?? utcOffset(a.start_date_local, a.start_date),
    distanceM: numberOrNull(a.distance) || null,
    movingSec: a.moving_time,
    elapsedSec: a.elapsed_time,
    elevationGainM: numberOrNull(a.total_elevation_gain),
    avgHr: numberOrNull(a.average_heartrate),
    maxHr: numberOrNull(a.max_heartrate),
    trainingLoad: numberOrNull(a.icu_training_load),
    // Garmin reports running cadence as strides of one leg per minute.
    cadenceSpm:
      cadence == null
        ? null
        : Math.round(sport === "run" ? cadence * 2 : cadence),
  };
}
