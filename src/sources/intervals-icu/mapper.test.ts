import { describe, expect, it } from "vitest";
import fixture from "./__fixtures__/activities.json";
import { toWorkout, type IntervalsActivity } from "./mapper";

const byId = (id: string) =>
  fixture.find((a) => a.id === id) as unknown as IntervalsActivity;

describe("toWorkout", () => {
  it("maps a run with its distance, times, heart rate and load", () => {
    const w = toWorkout(byId("i1001"));
    expect(w).toMatchObject({
      id: "i1001",
      sport: "run",
      name: "Morning run",
      startLocal: "2026-10-11T08:15:16",
      distanceM: 12577.6,
      movingSec: 4096,
      elapsedSec: 4194,
      avgHr: 156,
      maxHr: 180,
      trainingLoad: 104,
    });
    expect(w.elevationGainM).toBeCloseTo(68.1, 1);
  });

  it("derives the UTC offset when the source has no timezone name", () => {
    expect(toWorkout(byId("i1001")).timezone).toBe("+01:00");
  });

  it("doubles running cadence so it is steps per minute, not strides", () => {
    expect(toWorkout(byId("i1001")).cadenceSpm).toBe(157);
  });

  it("maps strength training with no distance", () => {
    const w = toWorkout(byId("i1005"));
    expect(w.sport).toBe("strength");
    expect(w.distanceM).toBeNull();
    expect(w.elevationGainM).toBeNull();
    expect(w.cadenceSpm).toBeNull();
  });

  it("treats a virtual ride as a ride", () => {
    expect(toWorkout(byId("i1006")).sport).toBe("ride");
  });

  it("falls back to the sport when a name is missing", () => {
    const raw = { ...byId("i1003"), name: null };
    expect(toWorkout(raw).name).toBe("Run");
  });

  it("maps unknown sports to other", () => {
    const raw = { ...byId("i1003"), type: "Kitesurf" };
    expect(toWorkout(raw).sport).toBe("other");
  });
});
