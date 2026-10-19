import { describe, expect, it, vi } from "vitest";
import { createIntervalsIcuClient, IntervalsIcuError } from "./client";

const okFetch = (body: unknown, status = 200) =>
  vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      }),
  );

const make = (fetch: typeof globalThis.fetch) =>
  createIntervalsIcuClient({ apiKey: "secret", athleteId: "i42", fetch });

const calledUrl = (fetch: ReturnType<typeof okFetch>) =>
  (fetch.mock.calls[0] as unknown as [string])[0];

describe("intervals.icu client", () => {
  it("lists activities for a date range with basic auth", async () => {
    const fetch = okFetch([{ id: "i1" }]);
    const result = await make(fetch).listActivities({
      oldest: "2026-10-01",
      newest: "2026-10-16",
    });

    expect(result).toEqual([{ id: "i1" }]);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(
      "https://intervals.icu/api/v1/athlete/i42/activities?oldest=2026-10-01&newest=2026-10-16",
    );
    const headers = new Headers(init.headers);
    expect(headers.get("authorization")).toBe(
      `Basic ${Buffer.from("API_KEY:secret").toString("base64")}`,
    );
  });

  it("narrows the listed fields when asked", async () => {
    const fetch = okFetch([]);
    await make(fetch).listActivities(
      { oldest: "2026-10-01", newest: "2026-10-16" },
      ["id", "external_id"],
    );
    expect(calledUrl(fetch)).toBe(
      "https://intervals.icu/api/v1/athlete/i42/activities?oldest=2026-10-01&newest=2026-10-16&fields=id%2Cexternal_id",
    );
  });

  it("uploads a file as multipart with the external id and reports 201 as created", async () => {
    const fetch = okFetch({ activities: [{ id: "i9" }] }, 201);
    const result = await make(fetch).uploadActivity(
      { filename: "ride.tcx", content: "<xml/>" },
      { externalId: "peloton:1", name: "30 min Ride", deviceName: "Peloton" },
    );
    expect(result).toEqual({ created: true });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(
      "https://intervals.icu/api/v1/athlete/i42/activities?external_id=peloton%3A1&name=30+min+Ride&device_name=Peloton",
    );
    expect(init.method).toBe("POST");
    const body = init.body as FormData;
    const file = body.get("file") as File;
    expect(file.name).toBe("ride.tcx");
    expect(await file.text()).toBe("<xml/>");
  });

  it("reports a 200 upload as a duplicate, not created", async () => {
    const fetch = okFetch({ activities: [] }, 200);
    const result = await make(fetch).uploadActivity(
      { filename: "ride.tcx", content: "<xml/>" },
      { externalId: "peloton:1" },
    );
    expect(result).toEqual({ created: false });
    expect(calledUrl(fetch)).toBe(
      "https://intervals.icu/api/v1/athlete/i42/activities?external_id=peloton%3A1",
    );
  });

  it("gets one activity by id", async () => {
    const fetch = okFetch({ id: "i7" });
    expect(await make(fetch).getActivity("i7")).toEqual({ id: "i7" });
    expect(calledUrl(fetch)).toBe("https://intervals.icu/api/v1/activity/i7");
  });

  it("gets the chosen streams", async () => {
    const fetch = okFetch([{ type: "time", data: [0, 1] }]);
    await make(fetch).getStreams("i7", ["time", "latlng"]);
    expect(calledUrl(fetch)).toBe(
      "https://intervals.icu/api/v1/activity/i7/streams?types=time%2Clatlng",
    );
  });

  it("gets the intervals", async () => {
    const fetch = okFetch({ icu_intervals: [] });
    await make(fetch).getIntervals("i7");
    expect(calledUrl(fetch)).toBe(
      "https://intervals.icu/api/v1/activity/i7/intervals",
    );
  });

  it("throws a typed error with the status on failure", async () => {
    const client = make(okFetch({ error: "nope" }, 401));
    const call = () =>
      client.listActivities({ oldest: "2026-10-01", newest: "2026-10-16" });
    await expect(call()).rejects.toBeInstanceOf(IntervalsIcuError);
    await expect(call()).rejects.toMatchObject({ status: 401 });
  });

  it("escapes the activity id in the path", async () => {
    const fetch = okFetch({});
    await make(fetch).getActivity("a/b");
    expect(calledUrl(fetch)).toBe(
      "https://intervals.icu/api/v1/activity/a%2Fb",
    );
  });
});
