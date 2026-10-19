import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const syncPeloton = vi.fn();
vi.mock("@/src/services/syncPeloton", () => ({
  syncPeloton: (...args: unknown[]) => syncPeloton(...args),
}));
vi.mock("@/src/sources/peloton/client", () => ({
  pelotonClientFromEnv: () => ({ kind: "peloton" }),
}));
vi.mock("@/src/sources/intervals-icu/client", () => ({
  intervalsIcuClientFromEnv: () => ({ kind: "intervals" }),
}));

import { GET } from "./route";

const request = (authorization?: string) =>
  new Request("https://example.test/api/cron/peloton", {
    headers: authorization ? { authorization } : {},
  });

describe("GET /api/cron/peloton", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "cron-secret";
    syncPeloton.mockReset();
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("refuses without the cron secret", async () => {
    expect((await GET(request())).status).toBe(401);
    expect((await GET(request("Bearer wrong"))).status).toBe(401);
    expect(syncPeloton).not.toHaveBeenCalled();
  });

  it("refuses everything when no secret is configured", async () => {
    delete process.env.CRON_SECRET;
    expect((await GET(request("Bearer cron-secret"))).status).toBe(401);
  });

  it("runs the sync with both clients and returns the report", async () => {
    const report = {
      checked: 1,
      uploaded: ["peloton:1"],
      alreadyThere: [],
      failed: [],
    };
    syncPeloton.mockResolvedValue(report);
    const res = await GET(request("Bearer cron-secret"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(report);
    expect(syncPeloton).toHaveBeenCalledWith({
      peloton: { kind: "peloton" },
      intervals: { kind: "intervals" },
    });
  });

  it("answers 502 with the message when the sync throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    syncPeloton.mockRejectedValue(new Error("Peloton login failed with 401"));
    const res = await GET(request("Bearer cron-secret"));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({
      error: "Peloton login failed with 401",
    });
  });
});
