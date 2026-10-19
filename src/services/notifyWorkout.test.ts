import { describe, expect, it, vi } from "vitest";
import activity from "@/src/sources/intervals-icu/__fixtures__/activity.json";
import streams from "@/src/sources/intervals-icu/__fixtures__/streams.json";
import intervals from "@/src/sources/intervals-icu/__fixtures__/intervals.json";
import type {
  IntervalsActivity,
  IntervalsStream,
} from "@/src/sources/intervals-icu/mapper";
import type { EmailMessage } from "@/src/sources/resend/client";
import { notifyWorkout } from "./notifyWorkout";

const client = () => ({
  getActivity: vi.fn(async () => activity as IntervalsActivity),
  getStreams: vi.fn(async () => streams as IntervalsStream[]),
  getIntervals: vi.fn(async () => intervals),
});

describe("notifyWorkout", () => {
  it("fetches the workout and emails its summary with the coach's line", async () => {
    const sender = {
      send: vi.fn<(m: EmailMessage) => Promise<void>>(async () => {}),
    };
    const result = await notifyWorkout({
      client: client(),
      id: "i1001",
      sender,
      to: "runner@example.com",
    });

    expect(result.subject).toBe(
      "Morning run: 12.6 km · 1:08:16 · 5:26 /km · HR 156",
    );
    expect(sender.send).toHaveBeenCalledTimes(1);
    const message = sender.send.mock.calls[0][0];
    expect(message.to).toBe("runner@example.com");
    expect(message.subject).toBe(result.subject);
    // The fixture's splits are real, so the coach line is about pacing.
    expect(message.text).toMatch(/negative split|slowed|Even pacing/);
    expect(message.html).toContain("Open in Claude");
    expect(message.html).not.toContain("<img");
  });

  it("puts a map in when a map image is available", async () => {
    const sender = {
      send: vi.fn<(m: EmailMessage) => Promise<void>>(async () => {}),
    };
    await notifyWorkout({
      client: client(),
      id: "i1001",
      sender,
      to: "runner@example.com",
      mapImage: (detail) =>
        detail.polyline ? "https://maps.example/i1001.png" : null,
    });
    expect(sender.send.mock.calls[0][0].html).toContain(
      '<img src="https://maps.example/i1001.png"',
    );
  });

  it("does not send when the workout cannot be read", async () => {
    const sender = {
      send: vi.fn<(m: EmailMessage) => Promise<void>>(async () => {}),
    };
    const broken = {
      ...client(),
      getActivity: vi.fn(async () => {
        throw new Error("down");
      }),
    };
    await expect(
      notifyWorkout({ client: broken, id: "i1", sender, to: "a@b.c" }),
    ).rejects.toThrow("down");
    expect(sender.send).not.toHaveBeenCalled();
  });
});
