import { describe, expect, it } from "vitest";
import { describeWorkoutDetail, formatStartTime } from "./describe";
import type { Lap, Workout } from "./workout";
import type { Split } from "./splits";

const run: Workout = {
  id: "i1",
  sport: "run",
  name: "Morning run",
  startLocal: "2026-10-11T08:15:16",
  timezone: "+01:00",
  distanceM: 12577.6,
  movingSec: 4096,
  elapsedSec: 4194,
  elevationGainM: 68.07,
  avgHr: 156,
  maxHr: 180,
  trainingLoad: 104,
  cadenceSpm: 157,
};

const split = (index: number, sec: number): Split => ({
  index,
  distanceM: 1000,
  sec,
  paceSecPerKm: sec,
  avgHr: 150,
  elevationGainM: 5,
});

const lap = (index: number): Lap => ({
  index,
  kind: "work",
  name: null,
  distanceM: 1000,
  movingSec: 320,
  elapsedSec: 320,
  avgHr: 150,
  maxHr: 160,
  elevationGainM: 4,
  cadenceSpm: 156,
});

describe("formatStartTime", () => {
  it("shows the local clock time", () => {
    expect(formatStartTime("2026-10-11T08:15:16")).toBe("08:15");
  });
});

describe("describeWorkoutDetail", () => {
  it("writes a compact summary Claude can coach from", () => {
    const text = describeWorkoutDetail({
      workout: run,
      splits: [split(1, 320), split(2, 310)],
      laps: [lap(1), lap(2)],
      polyline: "abc",
    });
    expect(text).toContain("Morning run (run), Sun 11 Oct 08:15");
    expect(text).toContain("12.6 km in 1:08:16 moving (1:09:54 elapsed)");
    expect(text).toContain("5:26 /km");
    expect(text).toContain("HR 156 avg, 180 max");
    expect(text).toContain("68 m climb");
    expect(text).toContain("157 spm");
    expect(text).toContain("load 104");
    expect(text).toContain("Splits: 1 km 5:20 HR 150 · 2 km 5:10 HR 150");
    expect(text).toContain(
      "Laps (2): 1 1.0 km 5:20 HR 150 · 2 1.0 km 5:20 HR 150",
    );
    expect(text).toContain("GPS route available");
  });

  it("leaves out what is missing", () => {
    const text = describeWorkoutDetail({
      workout: {
        ...run,
        sport: "strength",
        name: "Strength",
        distanceM: null,
        elevationGainM: null,
        avgHr: null,
        maxHr: null,
        cadenceSpm: null,
        trainingLoad: null,
      },
      splits: [],
      laps: [],
      polyline: null,
    });
    expect(text).toBe(
      "Strength (strength), Sun 11 Oct 08:15: 1:08:16 moving (1:09:54 elapsed).",
    );
  });
});
