import { describe, expect, it, vi } from "vitest";
import fixture from "@/src/sources/intervals-icu/__fixtures__/activities.json";
import type { IntervalsActivity } from "@/src/sources/intervals-icu/mapper";
import { getRecentWorkouts } from "./recentWorkouts";

const client = {
  listActivities: vi.fn(async () => fixture as unknown as IntervalsActivity[]),
};

describe("getRecentWorkouts", () => {
  it("asks for the right date range and returns workouts newest first", async () => {
    const now = new Date("2026-10-16T12:00:00Z");
    const result = await getRecentWorkouts({ client, days: 7, now });

    expect(client.listActivities).toHaveBeenCalledWith({
      oldest: "2026-10-10",
      newest: "2026-10-16",
    });
    expect(result.workouts.map((w) => w.id)).toEqual(["i1001", "i1005"]);
    expect(result.range).toEqual({
      oldest: "2026-10-10",
      newest: "2026-10-16",
    });
  });

  it("drops anything the source returns outside the window", async () => {
    const now = new Date("2026-10-16T12:00:00Z");
    const result = await getRecentWorkouts({ client, days: 7, now });
    expect(result.workouts.some((w) => w.id === "i1004")).toBe(false);
  });
});
