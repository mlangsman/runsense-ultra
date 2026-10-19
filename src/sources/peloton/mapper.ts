import type { TcxActivity, TcxSample, TcxSport } from "@/src/domain/tcx";
import type { PelotonPerformanceGraph, PelotonWorkout } from "./client";

/**
 * Which Peloton disciplines are copied to intervals.icu. Rides only for now:
 * strength and other classes are already recorded on the watch, so copying
 * them would double up.
 */
export const SYNCED_DISCIPLINES: ReadonlySet<string> = new Set([
  "cycling",
  "bike_bootcamp",
]);

const SPORTS: Record<string, TcxSport> = {
  cycling: "Biking",
  bike_bootcamp: "Biking",
  running: "Running",
  walking: "Running",
};

/** The id intervals.icu stores so a ride is never uploaded twice. */
export const externalId = (w: Pick<PelotonWorkout, "id">) => `peloton:${w.id}`;

export function isSyncable(w: PelotonWorkout): boolean {
  const complete = w.status == null || w.status.toUpperCase() === "COMPLETE";
  return complete && SYNCED_DISCIPLINES.has(w.fitness_discipline);
}

const METRES_PER_UNIT: Record<string, number> = {
  mi: 1609.344,
  km: 1000,
  m: 1,
};
const MPS_PER_UNIT: Record<string, number> = { mph: 0.44704, kph: 1 / 3.6 };

const factor = (
  table: Record<string, number>,
  unit: string | null | undefined,
) => table[(unit ?? "").toLowerCase()] ?? null;

export interface PelotonRide {
  externalId: string;
  name: string;
  activity: TcxActivity;
}

export function toPelotonRide(
  w: PelotonWorkout,
  g: PelotonPerformanceGraph,
): PelotonRide {
  const metric = (slug: string) => g.metrics.find((m) => m.slug === slug);
  const summary = (slug: string) => g.summaries.find((s) => s.slug === slug);
  const output = metric("output");
  const cadence = metric("cadence");
  const heartRate = metric("heart_rate");
  const speed = metric("speed");
  const speedToMps = factor(MPS_PER_UNIT, speed?.display_unit);

  const times = g.seconds_since_pedaling_start;
  let distance = 0;
  const samples: TcxSample[] = times.map((t, i) => {
    const v = speed?.values[i] ?? null;
    const mps = v != null && speedToMps != null ? v * speedToMps : null;
    if (i > 0 && mps != null) distance += mps * (t - times[i - 1]);
    return {
      offsetSec: t,
      watts: output?.values[i] ?? null,
      cadenceRpm: cadence?.values[i] ?? null,
      heartRateBpm: heartRate?.values[i] ?? null,
      speedMps: mps,
      distanceM: speedToMps != null ? distance : null,
    };
  });

  const dist = summary("distance");
  const distToMetres = factor(METRES_PER_UNIT, dist?.display_unit);
  const distanceM =
    dist?.value != null && distToMetres != null
      ? dist.value * distToMetres
      : speedToMps != null
        ? distance
        : null;

  const lastSample = times.length > 0 ? times[times.length - 1] : 0;
  const durationSec =
    g.duration ??
    (w.end_time != null ? w.end_time - w.start_time : null) ??
    lastSample;

  const name =
    w.ride?.title?.trim() ||
    w.title?.trim() ||
    w.name?.trim() ||
    "Peloton ride";
  const instructor = w.ride?.instructor?.name?.trim();

  return {
    externalId: externalId(w),
    name,
    activity: {
      sport: SPORTS[w.fitness_discipline] ?? "Other",
      startUtc: new Date(w.start_time * 1000).toISOString(),
      durationSec,
      distanceM,
      calories: summary("calories")?.value ?? null,
      notes: instructor
        ? `Peloton · ${name} with ${instructor}`
        : `Peloton · ${name}`,
      samples,
    },
  };
}
