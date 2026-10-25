import { describe, expect, it, vi } from "vitest";
import { createPelotonClient, PelotonError } from "./client";

type Call = [string, RequestInit | undefined];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const token = {
  access_token: "tok-1",
  refresh_token: "ref-1",
  token_type: "Bearer",
};
const me = { id: "user-1", username: "rider" };
const workout = (id: string, start_time: number) => ({
  id,
  start_time,
  fitness_discipline: "cycling",
  status: "COMPLETE",
  ride: { title: "30 min Ride", duration: 1800 },
});

/** A fetch that answers the token and /api/me calls once, then the given responses in order. */
const sequence = (...responses: Response[]) => {
  const queue = [json(token), json(me), ...responses];
  return vi.fn(async () => queue.shift() ?? json({}, 500));
};

const make = (fetch: ReturnType<typeof sequence>) =>
  createPelotonClient({
    username: "me@example.com",
    password: "pw-secret",
    fetch,
  });

describe("Peloton client", () => {
  it("gets a token with the password once, reads the user id, and sends the bearer token after", async () => {
    const fetch = sequence(json({ data: [] }), json({ data: [] }));
    const client = make(fetch);
    await client.listWorkouts({ since: new Date("2026-10-01T00:00:00Z") });
    await client.listWorkouts({ since: new Date("2026-10-01T00:00:00Z") });

    const calls = fetch.mock.calls as unknown as Call[];
    expect(calls).toHaveLength(4);
    const [tokenUrl, tokenInit] = calls[0];
    expect(tokenUrl).toBe("https://auth.onepeloton.com/oauth/token");
    expect(tokenInit?.method).toBe("POST");
    expect(JSON.parse(String(tokenInit?.body))).toEqual({
      grant_type: "password",
      client_id: "mgsmWCD0A8Qn6uz6mmqI6qeBNHH9IPwS",
      scope: "offline_access openid",
      username: "me@example.com",
      password: "pw-secret",
    });
    const [meUrl, meInit] = calls[1];
    expect(meUrl).toBe("https://api.onepeloton.com/api/me");
    expect(new Headers(meInit?.headers).get("authorization")).toBe(
      "Bearer tok-1",
    );
    const [listUrl, listInit] = calls[2];
    expect(listUrl).toBe(
      "https://api.onepeloton.com/api/user/user-1/workouts?limit=50&page=0&sort_by=-created&joins=ride%2Cride.instructor",
    );
    const headers = new Headers(listInit?.headers);
    expect(headers.get("authorization")).toBe("Bearer tok-1");
    expect(headers.get("cookie")).toBeNull();
    expect(headers.get("peloton-platform")).toBe("web");
  });

  it("pages until a workout older than `since` appears", async () => {
    const t = (iso: string) => Date.parse(iso) / 1000;
    const fetch = sequence(
      json({
        data: [
          workout("a", t("2026-10-18T17:00:00Z")),
          workout("b", t("2026-10-15T17:00:00Z")),
        ],
        page: 0,
        page_count: 3,
      }),
      json({
        data: [
          workout("c", t("2026-10-12T17:00:00Z")),
          workout("d", t("2026-10-01T17:00:00Z")),
        ],
        page: 1,
        page_count: 3,
      }),
    );
    const result = await make(fetch).listWorkouts({
      since: new Date("2026-10-11T00:00:00Z"),
      pageSize: 2,
    });
    expect(result.map((w) => w.id)).toEqual(["a", "b", "c"]);
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it("stops at the last page", async () => {
    const fetch = sequence(
      json({ data: [workout("a", 1_800_000_000)], page: 0, page_count: 1 }),
    );
    const result = await make(fetch).listWorkouts({
      since: new Date(0),
      pageSize: 1,
    });
    expect(result.map((w) => w.id)).toEqual(["a"]);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("reads the performance graph with every sample", async () => {
    const graph = {
      duration: 10,
      seconds_since_pedaling_start: [0, 1],
      metrics: [{ slug: "output", display_unit: "watts", values: [100, 110] }],
      summaries: [{ slug: "distance", value: 0.1, display_unit: "mi" }],
    };
    const fetch = sequence(json(graph));
    const result = await make(fetch).getPerformanceGraph("w/1");
    expect(result).toEqual(graph);
    expect((fetch.mock.calls[2] as unknown as Call)[0]).toBe(
      "https://api.onepeloton.com/api/workout/w%2F1/performance_graph?every_n=1",
    );
  });

  it("fails login with a typed error that carries no credentials", async () => {
    const fetch = vi.fn(async () => json({ message: "bad" }, 403));
    const err = await make(fetch)
      .login()
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PelotonError);
    expect((err as PelotonError).status).toBe(403);
    expect((err as Error).message).toBe("Peloton login failed with 403");
    expect((err as Error).message).not.toContain("pw-secret");
    expect((err as Error).message).not.toContain("me@example.com");
  });

  it("fails when the user id cannot be read", async () => {
    const queue = [json(token), json({ message: "nope" }, 401)];
    const fetch = vi.fn(async () => queue.shift() ?? json({}, 500));
    const err = await make(fetch)
      .login()
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PelotonError);
    expect((err as Error).message).toBe("Peloton responded 401 for /api/me");
  });

  it("rejects a response of the wrong shape", async () => {
    const fetch = sequence(json({ data: [{ id: 1 }] }));
    await expect(
      make(fetch).listWorkouts({ since: new Date(0) }),
    ).rejects.toThrow();
  });
});
