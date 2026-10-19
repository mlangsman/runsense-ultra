/**
 * Peloton has no public API. This client speaks to the endpoints the Peloton
 * app itself uses: a username and password login that returns a session id,
 * then plain JSON reads. The password is sent once per process to obtain the
 * session and is never logged or included in an error.
 */
import { z } from "zod";

const BASE_URL = "https://api.onepeloton.com";

export class PelotonError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "PelotonError";
  }
}

export interface PelotonClientOptions {
  username: string;
  password: string;
  /** Injected for tests; defaults to the global fetch. */
  fetch?: typeof fetch;
}

const loginResponse = z.object({ session_id: z.string(), user_id: z.string() });

/** The subset of a Peloton workout we read. Unknown fields are dropped. */
export const pelotonWorkoutSchema = z.object({
  id: z.string(),
  /** Epoch seconds. */
  start_time: z.number(),
  end_time: z.number().nullable().optional(),
  fitness_discipline: z.string(),
  status: z.string().nullable().optional(),
  timezone: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  /** Joules. */
  total_work: z.number().nullable().optional(),
  has_pedaling_metrics: z.boolean().nullable().optional(),
  ride: z
    .object({
      title: z.string().nullable().optional(),
      duration: z.number().nullable().optional(),
      instructor: z
        .object({ name: z.string().nullable().optional() })
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
});
export type PelotonWorkout = z.infer<typeof pelotonWorkoutSchema>;

const workoutsPage = z.object({
  data: z.array(pelotonWorkoutSchema),
  page: z.number().optional(),
  page_count: z.number().optional(),
});

const metric = z.object({
  slug: z.string(),
  display_unit: z.string().nullable().optional(),
  values: z.array(z.number().nullable()),
});
const summary = z.object({
  slug: z.string(),
  value: z.number().nullable().optional(),
  display_unit: z.string().nullable().optional(),
});

/** Second-by-second metrics for one workout. */
export const performanceGraphSchema = z.object({
  duration: z.number().nullable().optional(),
  seconds_since_pedaling_start: z.array(z.number()),
  metrics: z.array(metric).default([]),
  summaries: z.array(summary).default([]),
});
export type PelotonPerformanceGraph = z.infer<typeof performanceGraphSchema>;

const COMMON_HEADERS = {
  accept: "application/json",
  "peloton-platform": "web",
  "user-agent": "runsense-ultra",
};

export function createPelotonClient(options: PelotonClientOptions) {
  const doFetch = options.fetch ?? fetch;
  let session: { cookie: string; userId: string } | null = null;

  async function login(): Promise<string> {
    const res = await doFetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { ...COMMON_HEADERS, "content-type": "application/json" },
      body: JSON.stringify({
        username_or_email: options.username,
        password: options.password,
        with_pubsub: false,
      }),
    });
    if (!res.ok) {
      throw new PelotonError(
        `Peloton login failed with ${res.status}`,
        res.status,
      );
    }
    const parsed = loginResponse.parse(await res.json());
    session = {
      cookie: `peloton_session_id=${parsed.session_id}`,
      userId: parsed.user_id,
    };
    return parsed.user_id;
  }

  async function get<T>(path: string, schema: z.ZodType<T>): Promise<T> {
    if (!session) await login();
    const res = await doFetch(`${BASE_URL}${path}`, {
      headers: { ...COMMON_HEADERS, cookie: session!.cookie },
    });
    if (!res.ok) {
      throw new PelotonError(
        `Peloton responded ${res.status} for ${path}`,
        res.status,
      );
    }
    return schema.parse(await res.json());
  }

  return {
    login,
    /** Workouts started at or after `since`, newest first. Pages until it is past `since`. */
    async listWorkouts(opts: {
      since: Date;
      pageSize?: number;
    }): Promise<PelotonWorkout[]> {
      const pageSize = opts.pageSize ?? 50;
      const userId = session?.userId ?? (await login());
      const out: PelotonWorkout[] = [];
      for (let page = 0; ; page++) {
        const params = new URLSearchParams({
          limit: String(pageSize),
          page: String(page),
          sort_by: "-created",
          joins: "ride,ride.instructor",
        });
        const res = await get(
          `/api/user/${userId}/workouts?${params}`,
          workoutsPage,
        );
        for (const w of res.data) {
          if (w.start_time * 1000 < opts.since.getTime()) return out;
          out.push(w);
        }
        const last =
          res.data.length < pageSize ||
          (res.page_count != null && page + 1 >= res.page_count);
        if (last) return out;
      }
    },
    getPerformanceGraph(id: string): Promise<PelotonPerformanceGraph> {
      return get(
        `/api/workout/${encodeURIComponent(id)}/performance_graph?every_n=1`,
        performanceGraphSchema,
      );
    },
  };
}

export type PelotonClient = ReturnType<typeof createPelotonClient>;

/** Build a client from the server's environment. Throws if unconfigured. */
export function pelotonClientFromEnv(): PelotonClient {
  const username = process.env.PELOTON_USERNAME;
  const password = process.env.PELOTON_PASSWORD;
  if (!username || !password) {
    throw new Error("PELOTON_USERNAME and PELOTON_PASSWORD must be set");
  }
  return createPelotonClient({ username, password });
}
