import { describe, expect, it, vi } from "vitest";
import { createPelotonClient, PelotonError } from "./client";

type Call = [string, RequestInit | undefined];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const login = { session_id: "sess-1", user_id: "user-1" };
const workout = (id: string, start_time: number) => ({
  id,
  start_time,
  fitness_discipline: "cycling",
  status: "COMPLETE",
  ride: { title: "30 min Ride", duration: 1800 },
});

/** A fetch that answers login once, then the given responses in order. */
const sequence = (...responses: Response[]) => {
  const queue = [json(login), ...responses];
  return vi.fn(async () => queue.shift() ?? json({}, 500));
};

const make = (fetch: ReturnType<typeof sequence>) =>
  createPelotonClient({
    username: "me@example.com",
    password: "pw-secret",
    fetch,
  });

describe("Peloton client", () => {
  it("logs in with the password once and sends the session cookie after", async () => {
    const fetch = sequence(json({ data: [] }), json({ data: [] }));
    const client = make(fetch);
    await client.listWorkouts({ since: new Date("2026-10-01T00:00:00Z") });
    await client.listWorkouts({ since: new Date("2026-10-01T00:00:00Z") });

    const calls = fetch.mock.calls as unknown as Call[];
    expect(calls).toHaveLength(3);
    const [loginUrl, loginInit] = calls[0];
    expect(loginUrl).toBe("https://api.onepeloton.com/auth/login");
    expect(loginInit?.method).toBe("POST");
    expect(JSON.parse(String(loginInit?.body))).toEqual({
      username_or_email: "me@example.com",
      password: "pw-secret",
      with_pubsub: false,
    });
    const [listUrl, listInit] = calls[1];
    expect(listUrl).toBe(
      "https://api.onepeloton.com/api/user/user-1/workouts?limit=50&page=0&sort_by=-created&joins=ride%2Cride.instructor",
    );
    const headers = new Headers(listInit?.headers);
    expect(headers.get("cookie")).toBe("peloton_session_id=sess-1");
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
    expect(fetch).toHaveBeenCalledTimes(3);
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
    expect(fetch).toHaveBeenCalledTimes(2);
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
    expect((fetch.mock.calls[1] as unknown as Call)[0]).toBe(
      "https://api.onepeloton.com/api/workout/w%2F1/performance_graph?every_n=1",
    );
  });

  it("fails login with a typed error that carries no credentials", async () => {
    const fetch = vi.fn(async () => json({ message: "bad" }, 401));
    const err = await make(fetch)
      .login()
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PelotonError);
    expect((err as PelotonError).status).toBe(401);
    expect((err as Error).message).not.toContain("pw-secret");
    expect((err as Error).message).not.toContain("me@example.com");
  });

  it("rejects a response of the wrong shape", async () => {
    const fetch = sequence(json({ data: [{ id: 1 }] }));
    await expect(
      make(fetch).listWorkouts({ since: new Date(0) }),
    ).rejects.toThrow();
  });
});
