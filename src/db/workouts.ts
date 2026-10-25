/**
 * Reading and writing workout summaries. The only place that knows how a
 * `Workout` becomes a row and back; everything above it speaks `Workout`.
 */
import { and, desc, eq, gte, sql } from "drizzle-orm";
import type { Workout } from "@/src/domain/workout";
import type { Db } from "./client";
import { workouts, type NewWorkoutRow, type WorkoutRow } from "./schema";

const SOURCE = "intervals_icu";

export async function upsertWorkouts(
  db: Db,
  userId: string,
  items: Workout[],
): Promise<void> {
  if (items.length === 0) return;
  const rows = items.map((w) => toRow(userId, w));
  await db
    .insert(workouts)
    .values(rows)
    .onConflictDoUpdate({
      target: [workouts.userId, workouts.source, workouts.id],
      set: {
        sport: sql`excluded.sport`,
        name: sql`excluded.name`,
        startLocal: sql`excluded.start_local`,
        timezone: sql`excluded.timezone`,
        distanceM: sql`excluded.distance_m`,
        movingSec: sql`excluded.moving_sec`,
        elapsedSec: sql`excluded.elapsed_sec`,
        elevationGainM: sql`excluded.elevation_gain_m`,
        avgHr: sql`excluded.avg_hr`,
        maxHr: sql`excluded.max_hr`,
        trainingLoad: sql`excluded.training_load`,
        cadenceSpm: sql`excluded.cadence_spm`,
        updatedAt: sql`now()`,
      },
    });
}

export async function listWorkouts(
  db: Db,
  userId: string,
  opts: { since?: string } = {},
): Promise<Workout[]> {
  const where = opts.since
    ? and(eq(workouts.userId, userId), gte(workouts.startLocal, opts.since))
    : eq(workouts.userId, userId);
  const rows = await db
    .select()
    .from(workouts)
    .where(where)
    .orderBy(desc(workouts.startLocal), desc(workouts.id));
  return rows.map(fromRow);
}

function toRow(userId: string, w: Workout): NewWorkoutRow {
  return {
    userId,
    source: SOURCE,
    id: w.id,
    sport: w.sport,
    name: w.name,
    startLocal: w.startLocal,
    timezone: w.timezone,
    distanceM: w.distanceM,
    movingSec: w.movingSec,
    elapsedSec: w.elapsedSec,
    elevationGainM: w.elevationGainM,
    avgHr: w.avgHr,
    maxHr: w.maxHr,
    trainingLoad: w.trainingLoad,
    cadenceSpm: w.cadenceSpm,
  };
}

function fromRow(r: WorkoutRow): Workout {
  return {
    id: r.id,
    sport: r.sport as Workout["sport"],
    name: r.name,
    // Postgres hands back "2026-10-11 08:15:16"; the model uses the ISO "T".
    startLocal: r.startLocal.replace(" ", "T"),
    timezone: r.timezone,
    distanceM: r.distanceM,
    movingSec: r.movingSec,
    elapsedSec: r.elapsedSec,
    elevationGainM: r.elevationGainM,
    avgHr: r.avgHr,
    maxHr: r.maxHr,
    trainingLoad: r.trainingLoad,
    cadenceSpm: r.cadenceSpm,
  };
}
