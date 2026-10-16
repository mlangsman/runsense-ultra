import { describe, expect, it } from "vitest";
import type { Workout } from "./workout";
import { summarise, toWorkoutRow } from "./summary";

const base: Workout = {
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

describe("summarise", () => {
  it("totals run and ride distance and all moving time", () => {
    const s = summarise([
      base,
      { ...base, id: "i2", sport: "ride", distanceM: 42_300, movingSec: 5_465 },
      {
        ...base,
        id: "i3",
        sport: "strength",
        distanceM: null,
        movingSec: 2_700,
      },
    ]);
    expect(s).toEqual({
      count: 3,
      runKm: 10,
      rideKm: 42.3,
      movingSec: 11_165,
    });
  });

  it("handles an empty list", () => {
    expect(summarise([])).toEqual({
      count: 0,
      runKm: 0,
      rideKm: 0,
      movingSec: 0,
    });
  });
});

describe("toWorkoutRow", () => {
  it("shows pace for runs", () => {
    const row = toWorkoutRow(base);
    expect(row).toMatchObject({
      id: "i1",
      sport: "run",
      day: "Sun",
      date: "11 Oct",
      name: "Easy run",
      meta: "10.0 km · 50:00 · 5:00 /km · HR 150",
    });
  });

  it("shows speed for rides and duration only for strength", () => {
    expect(
      toWorkoutRow({
        ...base,
        sport: "ride",
        distanceM: 42_300,
        movingSec: 5_465,
        avgHr: 141,
      }).meta,
    ).toBe("42.3 km · 1:31:05 · 27.9 km/h · HR 141");
    expect(
      toWorkoutRow({
        ...base,
        sport: "strength",
        distanceM: null,
        movingSec: 2_700,
        avgHr: 118,
      }).meta,
    ).toBe("45:00 · HR 118");
  });

  it("omits heart rate when there is none", () => {
    expect(toWorkoutRow({ ...base, avgHr: null }).meta).toBe(
      "10.0 km · 50:00 · 5:00 /km",
    );
  });
});
