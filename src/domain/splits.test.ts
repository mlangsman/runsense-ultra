import { describe, expect, it } from "vitest";
import { computeSplits } from "./splits";

/** A runner at a steady 5:00/km for 2.5 km, sampled every 10 s. */
function steady(seconds: number, metresPerSec: number, hr = 150) {
  const n = Math.floor(seconds / 10) + 1;
  return {
    time: Array.from({ length: n }, (_, i) => i * 10),
    distance: Array.from({ length: n }, (_, i) => i * 10 * metresPerSec),
    heartrate: Array.from({ length: n }, () => hr),
    altitude: Array.from({ length: n }, (_, i) => 100 + i),
  };
}

describe("computeSplits", () => {
  it("cuts a run into whole kilometres plus the remainder", () => {
    const splits = computeSplits(steady(750, 1000 / 300));
    expect(splits.map((s) => s.index)).toEqual([1, 2, 3]);
    expect(splits[0]).toMatchObject({ distanceM: 1000, sec: 300 });
    expect(splits[0].paceSecPerKm).toBeCloseTo(300, 0);
    expect(splits[1].sec).toBeCloseTo(300, 0);
    expect(splits[2].distanceM).toBeCloseTo(500, 0);
    expect(splits[2].sec).toBeCloseTo(150, 0);
    expect(splits[2].paceSecPerKm).toBeCloseTo(300, 0);
  });

  it("interpolates the crossing time between samples", () => {
    // 3.5 m/s: the 1 km mark falls between samples at 280 s and 290 s.
    const splits = computeSplits(steady(300, 3.5));
    expect(splits[0].sec).toBeCloseTo(1000 / 3.5, 1);
  });

  it("averages heart rate and sums climb per split", () => {
    const splits = computeSplits(steady(600, 1000 / 300));
    expect(splits[0].avgHr).toBe(150);
    expect(splits[0].elevationGainM).toBeCloseTo(30, 0);
  });

  it("drops a trailing remainder under 100 m", () => {
    const splits = computeSplits(steady(310, 1000 / 300));
    expect(splits).toHaveLength(1);
  });

  it("works without heart rate or altitude", () => {
    const { time, distance } = steady(600, 1000 / 300);
    const splits = computeSplits({ time, distance });
    expect(splits).toHaveLength(2);
    expect(splits[0].avgHr).toBeNull();
    expect(splits[0].elevationGainM).toBeNull();
  });

  it("returns nothing for an empty or distance-less stream", () => {
    expect(computeSplits({ time: [], distance: [] })).toEqual([]);
    expect(computeSplits({ time: [0, 10], distance: [0, 0] })).toEqual([]);
  });
});
