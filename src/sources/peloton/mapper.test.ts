import { describe, expect, it } from "vitest";
import { performanceGraphSchema, pelotonWorkoutSchema } from "./client";
import { externalId, isSyncable, toPelotonRide } from "./mapper";
import graphJson from "./__fixtures__/performance-graph.json";
import workoutJson from "./__fixtures__/workout.json";

const workout = pelotonWorkoutSchema.parse(workoutJson);
const graph = performanceGraphSchema.parse(graphJson);

describe("Peloton mapper", () => {
  it("builds a stable external id", () => {
    expect(externalId(workout)).toBe("peloton:wk-fixture");
  });

  it("syncs completed rides only", () => {
    expect(isSyncable(workout)).toBe(true);
    expect(isSyncable({ ...workout, status: "IN_PROGRESS" })).toBe(false);
    expect(isSyncable({ ...workout, fitness_discipline: "strength" })).toBe(
      false,
    );
    expect(
      isSyncable({
        ...workout,
        status: null,
        fitness_discipline: "bike_bootcamp",
      }),
    ).toBe(true);
  });

  it("maps the ride header: sport, UTC start, duration, distance in metres, calories, name", () => {
    const ride = toPelotonRide(workout, graph);
    expect(ride.name).toBe("30 min Power Zone Ride");
    expect(ride.activity.sport).toBe("Biking");
    expect(ride.activity.startUtc).toBe("2026-10-18T17:58:51.000Z");
    expect(ride.activity.durationSec).toBe(1800);
    expect(ride.activity.distanceM).toBeCloseTo(8.82 * 1609.344, 3);
    expect(ride.activity.calories).toBe(410);
    expect(ride.activity.notes).toBe(
      "Peloton · 30 min Power Zone Ride with Fixture Instructor",
    );
  });

  it("maps each second to power, cadence, heart rate, speed and cumulative distance", () => {
    const { samples } = toPelotonRide(workout, graph).activity;
    expect(samples).toHaveLength(5);
    expect(samples[3]).toEqual({
      offsetSec: 3,
      watts: 200,
      cadenceRpm: 90,
      heartRateBpm: 131,
      speedMps: 18 * 0.44704,
      distanceM: (15 + 17 + 18) * 0.44704,
    });
  });

  it("copes with a graph that has no speed or summaries", () => {
    const ride = toPelotonRide(
      {
        ...workout,
        end_time: workout.start_time + 600,
        ride: null,
        name: null,
      },
      { seconds_since_pedaling_start: [0, 1], metrics: [], summaries: [] },
    );
    expect(ride.name).toBe("Peloton ride");
    expect(ride.activity.durationSec).toBe(600);
    expect(ride.activity.distanceM).toBeNull();
    expect(ride.activity.calories).toBeNull();
    expect(ride.activity.samples[1]).toEqual({
      offsetSec: 1,
      watts: null,
      cadenceRpm: null,
      heartRateBpm: null,
      speedMps: null,
      distanceM: null,
    });
  });

  it("reads kilometre and kph units", () => {
    const ride = toPelotonRide(workout, {
      seconds_since_pedaling_start: [0, 1],
      metrics: [{ slug: "speed", display_unit: "kph", values: [0, 36] }],
      summaries: [{ slug: "distance", display_unit: "km", value: 2 }],
    });
    expect(ride.activity.distanceM).toBe(2000);
    expect(ride.activity.samples[1].speedMps).toBeCloseTo(10, 9);
    expect(ride.activity.durationSec).toBe(1800);
  });
});
