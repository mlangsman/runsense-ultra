import type {
  IntervalsActivity,
  IntervalsIntervalsResponse,
  IntervalsStream,
} from "./mapper";

const BASE_URL = "https://intervals.icu/api/v1";

export class IntervalsIcuError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "IntervalsIcuError";
  }
}

export interface IntervalsIcuClientOptions {
  apiKey: string;
  athleteId: string;
  /** Injected for tests; defaults to the global fetch. */
  fetch?: typeof fetch;
}

export interface DateRange {
  /** Inclusive, YYYY-MM-DD in the athlete's local calendar. */
  oldest: string;
  newest: string;
}

/** The stream names intervals.icu serves that we know how to read. */
export type StreamType =
  | "time"
  | "distance"
  | "latlng"
  | "heartrate"
  | "altitude"
  | "cadence"
  | "velocity_smooth";

export function createIntervalsIcuClient(options: IntervalsIcuClientOptions) {
  const doFetch = options.fetch ?? fetch;
  const authorization = `Basic ${Buffer.from(`API_KEY:${options.apiKey}`).toString("base64")}`;

  async function get<T>(path: string): Promise<T> {
    const res = await doFetch(`${BASE_URL}${path}`, {
      headers: { authorization, accept: "application/json" },
    });
    if (!res.ok) {
      throw new IntervalsIcuError(
        `intervals.icu responded ${res.status} for ${path}`,
        res.status,
      );
    }
    return (await res.json()) as T;
  }

  return {
    listActivities(range: DateRange): Promise<IntervalsActivity[]> {
      const params = new URLSearchParams({
        oldest: range.oldest,
        newest: range.newest,
      });
      return get(`/athlete/${options.athleteId}/activities?${params}`);
    },
    getActivity(id: string): Promise<IntervalsActivity> {
      return get(`/activity/${encodeURIComponent(id)}`);
    },
    getStreams(id: string, types: StreamType[]): Promise<IntervalsStream[]> {
      const params = new URLSearchParams({ types: types.join(",") });
      return get(`/activity/${encodeURIComponent(id)}/streams?${params}`);
    },
    getIntervals(id: string): Promise<IntervalsIntervalsResponse> {
      return get(`/activity/${encodeURIComponent(id)}/intervals`);
    },
  };
}

export type IntervalsIcuClient = ReturnType<typeof createIntervalsIcuClient>;

/** Build a client from the server's environment. Throws if unconfigured. */
export function intervalsIcuClientFromEnv(): IntervalsIcuClient {
  const apiKey = process.env.INTERVALS_ICU_API_KEY;
  const athleteId = process.env.INTERVALS_ICU_ATHLETE_ID;
  if (!apiKey || !athleteId) {
    throw new Error(
      "INTERVALS_ICU_API_KEY and INTERVALS_ICU_ATHLETE_ID must be set",
    );
  }
  return createIntervalsIcuClient({ apiKey, athleteId });
}
