import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Workout } from "@/src/domain/workout";
import { listWorkouts, upsertWorkouts } from "./workouts";
import { createTestDb, type TestDb } from "./testDb";

const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";

const run: Workout = {
  id: "i1",
  sport: "run",
  name: "Easy run",
  startLocal: "2026-10-11T08:15:16",
  timezone: "+01:00",
  distanceM: 10_000,
  movingSec: 3_000,
  elapsedSec: 3_100,
  elevationGainM: 50,
  avgHr: 150,
  maxHr: 170,
  trainingLoad: 80,
  cadenceSpm: 170,
};

const strength: Workout = {
  id: "i2",
  sport: "strength",
  name: "Gym",
  startLocal: "2026-10-12T18:00:00",
  timezone: "+01:00",
  distanceM: null,
  movingSec: 2_700,
  elapsedSec: 2_700,
  elevationGainM: null,
  avgHr: null,
  maxHr: null,
  trainingLoad: null,
  cadenceSpm: null,
};

let db: TestDb;

beforeAll(async () => {
  db = await createTestDb();
});

afterAll(async () => {
  await db.close();
});

describe("workouts table", () => {
  it("stores a workout and reads it back unchanged, newest first", async () => {
    await upsertWorkouts(db.admin, alice, [run, strength]);
    const rows = await listWorkouts(db.admin, alice);
    expect(rows).toEqual([strength, run]);
  });

  it("upserts on the source id: a second sync updates rather than duplicates", async () => {
    await upsertWorkouts(db.admin, alice, [{ ...run, name: "Renamed run" }]);
    const rows = await listWorkouts(db.admin, alice);
    expect(rows.map((w) => [w.id, w.name])).toEqual([
      ["i2", "Gym"],
      ["i1", "Renamed run"],
    ]);
  });

  it("lists only workouts since a given local time", async () => {
    const rows = await listWorkouts(db.admin, alice, {
      since: "2026-10-12T00:00:00",
    });
    expect(rows.map((w) => w.id)).toEqual(["i2"]);
  });

  it("keeps each user's workouts apart", async () => {
    await upsertWorkouts(db.admin, bob, [{ ...run, name: "Bob's run" }]);
    const alices = await listWorkouts(db.admin, alice);
    const bobs = await listWorkouts(db.admin, bob);
    expect(alices.map((w) => w.name)).not.toContain("Bob's run");
    expect(bobs.map((w) => w.name)).toEqual(["Bob's run"]);
  });
});

describe("row-level security", () => {
  it("a signed-in user sees only their own rows", async () => {
    const seen = await db.asUser(bob, (tx) => listWorkouts(tx, alice));
    expect(seen).toEqual([]);
    const own = await db.asUser(bob, (tx) => listWorkouts(tx, bob));
    expect(own.map((w) => w.name)).toEqual(["Bob's run"]);
  });

  it("a signed-in user cannot write rows for someone else", async () => {
    // Drizzle wraps the driver's error; Postgres's own message is the cause.
    const err = await db
      .asUser(bob, (tx) => upsertWorkouts(tx, alice, [strength]))
      .then(
        () => null,
        (e: unknown) => e as Error & { cause?: Error },
      );
    expect(err?.cause?.message ?? err?.message).toMatch(/row-level security/);
    expect(await listWorkouts(db.admin, alice)).toHaveLength(2);
  });

  it("without a signed-in user nothing is visible", async () => {
    const seen = await db.asUser(null, (tx) => listWorkouts(tx, alice));
    expect(seen).toEqual([]);
  });
});
