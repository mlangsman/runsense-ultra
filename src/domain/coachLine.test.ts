import { describe, expect, it } from "vitest";
import { coachLine } from "./coachLine";
import type { Split } from "./splits";
import type { Workout } from "./workout";

const run: Workout = {
  id: "i1",
  sport: "run",
  name: "Morning run",
  startLocal: "2026-10-11T08:15:16",
  timezone: "+01:00",
  distanceM: 10000,
  movingSec: 3000,
  elapsedSec: 3100,
  elevationGainM: 50,
  avgHr: 150,
  maxHr: 170,
  trainingLoad: 80,
  cadenceSpm: 170,
};

const splitsAt = (paces: number[]): Split[] =>
  paces.map((p, i) => ({
    index: i + 1,
    distanceM: 1000,
    sec: p,
    paceSecPerKm: p,
    avgHr: null,
    elevationGainM: null,
  }));

describe("coachLine", () => {
  it("spots a negative split", () => {
    expect(
      coachLine({ workout: run, splits: splitsAt([330, 330, 320, 310]) }),
    ).toBe(
      "A negative split: the second half was 15 s/km quicker than the first.",
    );
  });

  it("notes a fade without diagnosing it", () => {
    const line = coachLine({
      workout: run,
      splits: splitsAt([300, 300, 300, 320, 320, 320]),
    });
    expect(line).toBe(
      "You slowed by 20 s/km in the second half. Worth noting how it felt.",
    );
  });

  it("calls near-identical halves even", () => {
    expect(
      coachLine({ workout: run, splits: splitsAt([300, 302, 301, 303]) }),
    ).toBe("Even pacing: the two halves were within 1 s/km of each other.");
  });

  it("ignores the partial last split and the odd middle one", () => {
    const splits = [
      ...splitsAt([300, 300, 290, 280, 280]),
      {
        ...splitsAt([600])[0],
        index: 6,
        distanceM: 400,
      },
    ];
    expect(coachLine({ workout: run, splits })).toMatch(/^A negative split/);
  });

  it("stays generic for short runs and other sports", () => {
    expect(coachLine({ workout: run, splits: splitsAt([300, 300, 300]) })).toBe(
      "Logged and in your history.",
    );
    expect(
      coachLine({
        workout: { ...run, sport: "ride" },
        splits: splitsAt([100, 100, 100, 100]),
      }),
    ).toBe("Logged and in your history.");
  });
});
