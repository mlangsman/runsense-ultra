/**
 * Copy new Peloton rides into intervals.icu as TCX uploads, so they join the
 * training history the coach reads. Runs from the cron route. Idempotent:
 * a ride whose external id intervals.icu already holds is skipped, and
 * intervals.icu de-dupes the file itself as a second guard.
 */
import { buildTcx } from "@/src/domain/tcx";
import type { DateRange, UploadMeta } from "@/src/sources/intervals-icu/client";
import type { IntervalsActivity } from "@/src/sources/intervals-icu/mapper";
import type {
  PelotonPerformanceGraph,
  PelotonWorkout,
} from "@/src/sources/peloton/client";
import { isSyncable, toPelotonRide } from "@/src/sources/peloton/mapper";

export interface PelotonSource {
  listWorkouts(opts: { since: Date }): Promise<PelotonWorkout[]>;
  getPerformanceGraph(id: string): Promise<PelotonPerformanceGraph>;
}

export interface UploadTarget {
  listActivities(
    range: DateRange,
    fields?: string[],
  ): Promise<Pick<IntervalsActivity, "id" | "external_id">[]>;
  uploadActivity(
    file: { filename: string; content: string },
    meta: UploadMeta,
  ): Promise<{ created: boolean }>;
}

export interface SyncPelotonOptions {
  peloton: PelotonSource;
  intervals: UploadTarget;
  /** How many days back to look. */
  days?: number;
  now?: Date;
}

export interface SyncReport {
  since: string;
  /** Completed rides found at Peloton in the window. */
  checked: number;
  uploaded: string[];
  alreadyThere: string[];
  failed: { id: string; reason: string }[];
}

const DAY_MS = 86_400_000;
const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export async function syncPeloton({
  peloton,
  intervals,
  days = 7,
  now = new Date(),
}: SyncPelotonOptions): Promise<SyncReport> {
  const since = new Date(now.getTime() - days * DAY_MS);
  const rides = (await peloton.listWorkouts({ since })).filter(isSyncable);
  const report: SyncReport = {
    since: since.toISOString(),
    checked: rides.length,
    uploaded: [],
    alreadyThere: [],
    failed: [],
  };
  if (rides.length === 0) return report;

  // A day either side: the range is in the athlete's local calendar.
  const existing = await intervals.listActivities(
    {
      oldest: isoDate(new Date(since.getTime() - DAY_MS)),
      newest: isoDate(new Date(now.getTime() + DAY_MS)),
    },
    ["id", "external_id"],
  );
  const known = new Set(existing.map((a) => a.external_id).filter(Boolean));

  for (const workout of rides) {
    const ride = { externalId: `peloton:${workout.id}` };
    if (known.has(ride.externalId)) {
      report.alreadyThere.push(ride.externalId);
      continue;
    }
    try {
      const graph = await peloton.getPerformanceGraph(workout.id);
      const { externalId, name, activity } = toPelotonRide(workout, graph);
      const { created } = await intervals.uploadActivity(
        {
          filename: `${externalId.replace(":", "-")}.tcx`,
          content: buildTcx(activity),
        },
        { externalId, name, deviceName: "Peloton" },
      );
      (created ? report.uploaded : report.alreadyThere).push(externalId);
    } catch (err) {
      report.failed.push({
        id: ride.externalId,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return report;
}
