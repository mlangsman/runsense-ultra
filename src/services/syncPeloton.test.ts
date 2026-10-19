import { describe, expect, it, vi } from "vitest";
import {
  performanceGraphSchema,
  pelotonWorkoutSchema,
} from "@/src/sources/peloton/client";
import graphJson from "@/src/sources/peloton/__fixtures__/performance-graph.json";
import workoutJson from "@/src/sources/peloton/__fixtures__/workout.json";
import { syncPeloton } from "./syncPeloton";

const workout = pelotonWorkoutSchema.parse(workoutJson);
const graph = performanceGraphSchema.parse(graphJson);
const now = new Date("2026-10-19T12:00:00Z");

const makePeloton = (workouts = [workout]) => ({
  listWorkouts: vi.fn(async () => workouts),
  getPerformanceGraph: vi.fn(async () => graph),
});

const makeIntervals = (
  existing: { id: string; external_id?: string }[] = [],
  created = true,
) => ({
  listActivities: vi.fn(async () => existing),
  uploadActivity: vi.fn(async () => ({ created })),
});

describe("syncPeloton", () => {
  it("uploads a new ride as TCX with its external id, name and device", async () => {
    const peloton = makePeloton();
    const intervals = makeIntervals();
    const report = await syncPeloton({ peloton, intervals, days: 7, now });

    expect(peloton.listWorkouts).toHaveBeenCalledWith({
      since: new Date("2026-10-12T12:00:00Z"),
    });
    expect(intervals.listActivities).toHaveBeenCalledWith(
      { oldest: "2026-10-11", newest: "2026-10-20" },
      ["id", "external_id"],
    );
    expect(peloton.getPerformanceGraph).toHaveBeenCalledWith("wk-fixture");
    const [file, meta] = intervals.uploadActivity.mock.calls[0] as unknown as [
      { filename: string; content: string },
      { externalId: string; name: string; deviceName: string },
    ];
    expect(file.filename).toBe("peloton-wk-fixture.tcx");
    expect(file.content).toContain('<Activity Sport="Biking">');
    expect(file.content).toContain("<ns3:Watts>200</ns3:Watts>");
    expect(meta).toEqual({
      externalId: "peloton:wk-fixture",
      name: "30 min Power Zone Ride",
      deviceName: "Peloton",
    });
    expect(report).toEqual({
      since: "2026-10-12T12:00:00.000Z",
      checked: 1,
      uploaded: ["peloton:wk-fixture"],
      alreadyThere: [],
      failed: [],
    });
  });

  it("skips a ride intervals.icu already holds without fetching its graph", async () => {
    const peloton = makePeloton();
    const intervals = makeIntervals([
      { id: "i1", external_id: "peloton:wk-fixture" },
      { id: "i2" },
    ]);
    const report = await syncPeloton({ peloton, intervals, now });
    expect(peloton.getPerformanceGraph).not.toHaveBeenCalled();
    expect(intervals.uploadActivity).not.toHaveBeenCalled();
    expect(report.alreadyThere).toEqual(["peloton:wk-fixture"]);
  });

  it("counts a duplicate upload as already there", async () => {
    const report = await syncPeloton({
      peloton: makePeloton(),
      intervals: makeIntervals([], false),
      now,
    });
    expect(report.uploaded).toEqual([]);
    expect(report.alreadyThere).toEqual(["peloton:wk-fixture"]);
  });

  it("ignores classes that are not rides and does nothing when there is nothing to do", async () => {
    const strength = { ...workout, id: "s1", fitness_discipline: "strength" };
    const intervals = makeIntervals();
    const report = await syncPeloton({
      peloton: makePeloton([strength]),
      intervals,
      now,
    });
    expect(intervals.listActivities).not.toHaveBeenCalled();
    expect(report.checked).toBe(0);
  });

  it("records a failure for one ride and carries on with the next", async () => {
    const second = { ...workout, id: "wk-2" };
    const peloton = makePeloton([workout, second]);
    peloton.getPerformanceGraph
      .mockRejectedValueOnce(new Error("Peloton responded 500 for graph"))
      .mockResolvedValueOnce(graph);
    const intervals = makeIntervals();
    const report = await syncPeloton({ peloton, intervals, now });
    expect(report.failed).toEqual([
      { id: "peloton:wk-fixture", reason: "Peloton responded 500 for graph" },
    ]);
    expect(report.uploaded).toEqual(["peloton:wk-2"]);
  });
});
