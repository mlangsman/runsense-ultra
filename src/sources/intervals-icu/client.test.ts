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

describe("intervals.icu client", () => {
  it("lists activities for a date range with basic auth", async () => {
    const fetch = okFetch([{ id: "i1" }]);
    const client = createIntervalsIcuClient({
      apiKey: "secret",
      athleteId: "i42",
      fetch,
    });

    const result = await client.listActivities({
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

  it("throws a typed error with the status on failure", async () => {
    const client = createIntervalsIcuClient({
      apiKey: "bad",
      athleteId: "i42",
      fetch: okFetch({ error: "nope" }, 401),
    });

    await expect(
      client.listActivities({ oldest: "2026-10-01", newest: "2026-10-16" }),
    ).rejects.toBeInstanceOf(IntervalsIcuError);
    await expect(
      client.listActivities({ oldest: "2026-10-01", newest: "2026-10-16" }),
    ).rejects.toMatchObject({ status: 401 });
  });
});
