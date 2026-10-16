import type { Lap, Workout } from "@/src/domain/workout";
import { computeSplits, type Split } from "@/src/domain/splits";
import { encodePolyline, simplify, type LatLng } from "@/src/domain/route";
import {
  IntervalsIcuError,
  type StreamType,
} from "@/src/sources/intervals-icu/client";
import {
  toLap,
  toStreams,
  toWorkout,
  type IntervalsActivity,
  type IntervalsIntervalsResponse,
  type IntervalsStream,
} from "@/src/sources/intervals-icu/mapper";

export interface WorkoutDetailSource {
  getActivity(id: string): Promise<IntervalsActivity>;
  getStreams(id: string, types: StreamType[]): Promise<IntervalsStream[]>;
  getIntervals(id: string): Promise<IntervalsIntervalsResponse>;
}

export interface WorkoutDetail {
  workout: Workout;
  /** The GPS track as an encoded polyline, simplified; null without GPS. */
  polyline: string | null;
  splits: Split[];
  laps: Lap[];
}

const STREAMS: StreamType[] = [
  "time",
  "distance",
  "latlng",
  "heartrate",
  "altitude",
];

/** Enough points to draw the shape of a run, few enough to sit in a tool result. */
const MAX_TRACK_POINTS = 200;
const START_TOLERANCE_DEG = 0.00005; // about 5 m

export async function getWorkoutDetail({
  client,
  id,
}: {
  client: WorkoutDetailSource;
  id: string;
}): Promise<WorkoutDetail> {
  const [activity, rawStreams, rawIntervals] = await Promise.all([
    client.getActivity(id),
    orNoneOn404(client.getStreams(id, STREAMS), []),
    orNoneOn404(client.getIntervals(id), { icu_intervals: [] }),
  ]);
  const workout = toWorkout(activity);
  const streams = toStreams(rawStreams);

  const splits =
    streams.time && streams.distance
      ? computeSplits({
          time: streams.time,
          distance: streams.distance,
          heartrate: streams.heartrate,
          altitude: streams.altitude,
        })
      : [];
  const laps = (rawIntervals.icu_intervals ?? []).map((i, n) =>
    toLap(i, n, workout.sport),
  );
  const track = compactTrack(streams.latlng ?? []);

  return {
    workout,
    polyline: track.length > 1 ? encodePolyline(track) : null,
    splits,
    laps,
  };
}

/** Simplify with a growing tolerance until the track is small enough. */
function compactTrack(points: LatLng[]): LatLng[] {
  const clean = points.filter(
    (p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]),
  );
  let tolerance = START_TOLERANCE_DEG;
  let track = simplify(clean, tolerance);
  while (track.length > MAX_TRACK_POINTS) {
    tolerance *= 2;
    track = simplify(clean, tolerance);
  }
  return track;
}

async function orNoneOn404<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch (err) {
    if (err instanceof IntervalsIcuError && err.status === 404) return fallback;
    throw err;
  }
}
