import type { Lap, Sport, Workout } from "@/src/domain/workout";
import type { LatLng } from "@/src/domain/route";

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

/** One entry of the streams response: a named series, one value per sample. */
export interface IntervalsStream {
  type: string;
  data: unknown[];
}

export interface ActivityStreams {
  time?: number[];
  distance?: number[];
  latlng?: LatLng[];
  heartrate?: number[];
  altitude?: number[];
  cadence?: number[];
  velocity_smooth?: number[];
}

const STREAM_NAMES = [
  "time",
  "distance",
  "latlng",
  "heartrate",
  "altitude",
  "cadence",
  "velocity_smooth",
] as const;

export function toStreams(raw: IntervalsStream[]): ActivityStreams {
  const out: ActivityStreams = {};
  for (const stream of raw) {
    if (!Array.isArray(stream.data)) continue;
    const name = STREAM_NAMES.find((n) => n === stream.type);
    if (!name) continue;
    if (name === "latlng") {
      out.latlng = stream.data as LatLng[];
    } else {
      out[name] = stream.data as number[];
    }
  }
  return out;
}

/** One interval of an activity: a watch lap, or a work/recovery block. */
export interface IntervalsInterval {
  id?: number;
  type?: string | null;
  label?: string | null;
  start_index?: number;
  end_index?: number;
  distance?: number | null;
  moving_time?: number | null;
  elapsed_time?: number | null;
  average_heartrate?: number | null;
  max_heartrate?: number | null;
  average_cadence?: number | null;
  average_speed?: number | null;
  total_elevation_gain?: number | null;
}

export interface IntervalsIntervalsResponse {
  icu_intervals?: IntervalsInterval[] | null;
}

export function toLap(
  i: IntervalsInterval,
  position: number,
  sport: Sport = "run",
): Lap {
  const cadence = numberOrNull(i.average_cadence);
  return {
    index: position + 1,
    kind: i.type === "RECOVERY" ? "recovery" : "work",
    name: i.label?.trim() || null,
    distanceM: numberOrNull(i.distance),
    movingSec: numberOrNull(i.moving_time) ?? numberOrNull(i.elapsed_time) ?? 0,
    elapsedSec:
      numberOrNull(i.elapsed_time) ?? numberOrNull(i.moving_time) ?? 0,
    avgHr: numberOrNull(i.average_heartrate),
    maxHr: numberOrNull(i.max_heartrate),
    elevationGainM: numberOrNull(i.total_elevation_gain),
    cadenceSpm:
      cadence == null
        ? null
        : Math.round(sport === "run" ? cadence * 2 : cadence),
  };
}
