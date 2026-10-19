import type { Workout } from "@/src/domain/workout";
import type { DateRange } from "@/src/sources/intervals-icu/client";
import {
  isStub,
  toWorkout,
  type IntervalsActivity,
} from "@/src/sources/intervals-icu/mapper";

export interface WorkoutSource {
  listActivities(range: DateRange): Promise<IntervalsActivity[]>;
}

export interface RecentWorkoutsOptions {
  client: WorkoutSource;
  /** How many days back from today, inclusive of today. */
  days: number;
  now?: Date;
}

export interface RecentWorkouts {
  range: DateRange;
  workouts: Workout[];
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export async function getRecentWorkouts({
  client,
  days,
  now = new Date(),
}: RecentWorkoutsOptions): Promise<RecentWorkouts> {
  const newest = isoDate(now);
  const oldest = isoDate(new Date(now.getTime() - (days - 1) * 86_400_000));
  const raw = await client.listActivities({ oldest, newest });
  const workouts = raw
    .filter((a) => !isStub(a))
    .map(toWorkout)
    .filter((w) => {
      const day = w.startLocal.slice(0, 10);
      return day >= oldest && day <= newest;
    })
    .sort((a, b) => (a.startLocal < b.startLocal ? 1 : -1));
  return { range: { oldest, newest }, workouts };
}
