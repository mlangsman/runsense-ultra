import { describe, expect, it, vi } from "vitest";
import activity from "@/src/sources/intervals-icu/__fixtures__/activity.json";
import streams from "@/src/sources/intervals-icu/__fixtures__/streams.json";
import intervals from "@/src/sources/intervals-icu/__fixtures__/intervals.json";
import { IntervalsIcuError } from "@/src/sources/intervals-icu/client";
import type {
  IntervalsActivity,
  IntervalsStream,
} from "@/src/sources/intervals-icu/mapper";
import { decodePolyline } from "@/src/domain/route";
import { getWorkoutDetail } from "./workoutDetail";

const fullClient = () => ({
  getActivity: vi.fn(async () => activity as IntervalsActivity),
  getStreams: vi.fn(async () => streams as IntervalsStream[]),
  getIntervals: vi.fn(async () => intervals),
});

describe("getWorkoutDetail", () => {
  it("returns the workout, a compact route, splits and laps", async () => {
    const client = fullClient();
    const detail = await getWorkoutDetail({ client, id: "i1001" });

    expect(client.getActivity).toHaveBeenCalledWith("i1001");
    expect(client.getStreams).toHaveBeenCalledWith("i1001", [
      "time",
      "distance",
      "latlng",
      "heartrate",
      "altitude",
    ]);
    expect(detail.workout.id).toBe("i1001");
    expect(detail.workout.sport).toBe("run");
    expect(detail.splits).toHaveLength(13);
    expect(detail.splits[0].distanceM).toBe(1000);
    expect(detail.laps).toHaveLength(13);
    expect(detail.laps[0].index).toBe(1);

    const track = decodePolyline(detail.polyline!);
    expect(track.length).toBeGreaterThan(20);
    expect(track.length).toBeLessThanOrEqual(200);
    expect(track[0][0]).toBeCloseTo(51.4525, 4);
  });

  it("copes with a workout that has no streams or intervals", async () => {
    const client = {
      ...fullClient(),
      getStreams: vi.fn(async () => {
        throw new IntervalsIcuError("none", 404);
      }),
      getIntervals: vi.fn(async () => {
        throw new IntervalsIcuError("none", 404);
      }),
    };
    const detail = await getWorkoutDetail({ client, id: "i1001" });
    expect(detail.polyline).toBeNull();
    expect(detail.splits).toEqual([]);
    expect(detail.laps).toEqual([]);
  });

  it("lets other source errors through", async () => {
    const client = {
      ...fullClient(),
      getActivity: vi.fn(async () => {
        throw new IntervalsIcuError("down", 503);
      }),
    };
    await expect(getWorkoutDetail({ client, id: "i1001" })).rejects.toThrow(
      "down",
    );
  });
});
