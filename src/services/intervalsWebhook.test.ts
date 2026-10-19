import { describe, expect, it, vi } from "vitest";
import { handleIntervalsWebhook } from "./intervalsWebhook";

const uploaded = (activityId: string, athlete = "i42") => ({
  athlete_id: athlete,
  type: "ACTIVITY_UPLOADED",
  activity: { id: activityId },
});

const handle = (
  body: unknown,
  overrides: Partial<Parameters<typeof handleIntervalsWebhook>[0]> = {},
) =>
  handleIntervalsWebhook({
    body,
    authorization: null,
    secret: "whsec",
    athleteId: "i42",
    notify: vi.fn<(id: string) => Promise<void>>(async () => {}),
    ...overrides,
  });

describe("handleIntervalsWebhook", () => {
  it("emails each newly uploaded activity of the athlete", async () => {
    const notify = vi.fn<(id: string) => Promise<void>>(async () => {});
    const result = await handle(
      { secret: "whsec", events: [uploaded("a1"), uploaded("a2")] },
      { notify },
    );
    expect(result).toEqual({
      status: 200,
      body: { notified: ["a1", "a2"], ignored: 0 },
    });
    expect(notify.mock.calls.map((c) => c[0])).toEqual(["a1", "a2"]);
  });

  it("ignores other events, other athletes and events with no activity", async () => {
    const notify = vi.fn<(id: string) => Promise<void>>(async () => {});
    const result = await handle(
      {
        secret: "whsec",
        events: [
          { ...uploaded("a1"), type: "ACTIVITY_ANALYZED" },
          uploaded("a2", "i99"),
          { athlete_id: "i42", type: "CALENDAR_UPDATED" },
          uploaded("a3"),
        ],
      },
      { notify },
    );
    expect(result.body).toEqual({ notified: ["a3"], ignored: 3 });
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it("accepts numeric ids", async () => {
    const result = await handle(
      {
        secret: "whsec",
        events: [
          { athlete_id: 42, type: "ACTIVITY_UPLOADED", activity: { id: 7 } },
        ],
      },
      { athleteId: "42" },
    );
    expect(result.body.notified).toEqual(["7"]);
  });

  it("takes the secret from the Authorization header, as the app settings send it", async () => {
    const ok = await handle(
      { events: [uploaded("a1")] },
      { authorization: "whsec" },
    );
    expect(ok.status).toBe(200);
    const wrong = await handle(
      { secret: "whsec", events: [uploaded("a1")] },
      { authorization: "nope" },
    );
    expect(wrong.status).toBe(401);
  });

  it("rejects a wrong or missing secret and never notifies", async () => {
    const notify = vi.fn<(id: string) => Promise<void>>(async () => {});
    const wrong = await handle(
      { secret: "nope", events: [uploaded("a1")] },
      { notify },
    );
    expect(wrong.status).toBe(401);
    const unset = await handle(
      { secret: "whsec", events: [uploaded("a1")] },
      { notify, secret: undefined },
    );
    expect(unset.status).toBe(401);
    expect(notify).not.toHaveBeenCalled();
  });

  it("rejects a malformed body before looking at the secret", async () => {
    expect((await handle(null)).status).toBe(400);
    expect((await handle({ events: [] })).status).toBe(401);
    expect(
      (await handle({ secret: "whsec", events: [{ type: 1 }] })).status,
    ).toBe(400);
  });

  it("acknowledges but does nothing when notifications are off", async () => {
    const result = await handle(
      { secret: "whsec", events: [uploaded("a1")] },
      { notify: null },
    );
    expect(result).toEqual({ status: 200, body: { notified: [], ignored: 1 } });
  });

  it("lets a failed send through so the caller can report it", async () => {
    await expect(
      handle(
        { secret: "whsec", events: [uploaded("a1")] },
        {
          notify: vi.fn(async () => {
            throw new Error("Resend responded 500");
          }),
        },
      ),
    ).rejects.toThrow("Resend responded 500");
  });
});
