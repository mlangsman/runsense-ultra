/**
 * The database schema, in Drizzle. `npm run db:generate` turns changes here
 * into SQL under src/db/migrations; `npm run db:migrate` applies them to
 * Supabase. Tests apply the same migrations to an in-memory PGlite.
 *
 * Every table carries `user_id` and a row-level security policy from its
 * first migration (CLAUDE.md, Security).
 */
import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgPolicy,
  pgTable,
  primaryKey,
  doublePrecision,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUid } from "drizzle-orm/supabase";

/**
 * One summary row per workout, the shape of `Workout` in src/domain. The
 * source of truth stays with intervals.icu; this copy makes the log, trends
 * and volume checks instant and is rebuildable (DECISIONS.md, 16 Oct).
 */
export const workouts = pgTable(
  "workouts",
  {
    /** Supabase Auth user. No foreign key until accounts arrive in Phase 1. */
    userId: uuid("user_id").notNull(),
    /** Where the row came from; the id below is that source's id. */
    source: text("source").notNull().default("intervals_icu"),
    id: text("id").notNull(),
    sport: text("sport").notNull(),
    name: text("name").notNull(),
    /** Local wall-clock start, no zone; the offset is kept alongside. */
    startLocal: timestamp("start_local", { mode: "string" }).notNull(),
    timezone: text("timezone").notNull(),
    distanceM: doublePrecision("distance_m"),
    movingSec: integer("moving_sec").notNull(),
    elapsedSec: integer("elapsed_sec").notNull(),
    elevationGainM: doublePrecision("elevation_gain_m"),
    avgHr: integer("avg_hr"),
    maxHr: integer("max_hr"),
    trainingLoad: doublePrecision("training_load"),
    cadenceSpm: integer("cadence_spm"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.source, t.id] }),
    index("workouts_user_start_idx").on(t.userId, t.startLocal),
    // Owner-only, for every statement, as the signed-in Supabase user.
    pgPolicy("workouts_owner", {
      for: "all",
      to: authenticatedRole,
      using: sql`${authUid} = ${t.userId}`,
      withCheck: sql`${authUid} = ${t.userId}`,
    }),
  ],
).enableRLS();

export type WorkoutRow = typeof workouts.$inferSelect;
export type NewWorkoutRow = typeof workouts.$inferInsert;
