import { describe, expect, it } from "vitest";
import fixture from "./__fixtures__/activities.json";
import streamsFixture from "./__fixtures__/streams.json";
import intervalsFixture from "./__fixtures__/intervals.json";
import {
  toLap,
  toStreams,
  toWorkout,
  type IntervalsActivity,
  type IntervalsStream,
} from "./mapper";

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

describe("toStreams", () => {
  it("picks the streams we use by name", () => {
    const s = toStreams(streamsFixture as IntervalsStream[]);
    expect(s.time?.length).toBe(420);
    expect(s.distance?.[419]).toBe(12577.6);
    expect(s.latlng?.[0]).toEqual([51.4525, -0.2715]);
    expect(s.heartrate?.length).toBe(420);
    expect(s.altitude?.length).toBe(420);
  });

  it("leaves missing streams undefined", () => {
    const s = toStreams([{ type: "time", data: [0, 1] }]);
    expect(s.time).toEqual([0, 1]);
    expect(s.latlng).toBeUndefined();
    expect(s.distance).toBeUndefined();
  });

  it("ignores a stream whose data is not an array", () => {
    const s = toStreams([
      { type: "time", data: "oops" as unknown as number[] },
    ]);
    expect(s.time).toBeUndefined();
  });
});

describe("toLap", () => {
  it("maps a watch lap with its distance, times and heart rate", () => {
    const lap = toLap(intervalsFixture.icu_intervals[0], 0);
    expect(lap).toMatchObject({
      index: 1,
      kind: "work",
      distanceM: 1013.8,
      movingSec: 320,
      elapsedSec: 320,
      avgHr: 153,
      maxHr: 158,
    });
    expect(lap.name).toBeNull();
    expect(lap.cadenceSpm).toBe(156);
    expect(lap.elevationGainM).toBeCloseTo(10.4, 1);
  });

  it("keeps a label and a recovery type when the source has them", () => {
    const lap = toLap(
      { ...intervalsFixture.icu_intervals[1], type: "RECOVERY", label: "Jog" },
      1,
    );
    expect(lap.kind).toBe("recovery");
    expect(lap.name).toBe("Jog");
    expect(lap.index).toBe(2);
  });
});
