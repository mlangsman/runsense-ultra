import { baseURL } from "@/baseUrl";
import { createMcpHandler } from "mcp-handler";
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import { formatDuration } from "@/src/domain/workout";
import { summarise, toWorkoutRow } from "@/src/domain/summary";
import { describeWorkoutDetail, formatStartTime } from "@/src/domain/describe";
import { getRecentWorkouts } from "@/src/services/recentWorkouts";
import { getWorkoutDetail } from "@/src/services/workoutDetail";
import {
  IntervalsIcuError,
  intervalsIcuClientFromEnv,
} from "@/src/sources/intervals-icu/client";

/**
 * Each widget lives at ONE stable address. Claude caches a connector's tool
 * list and widget HTML when the connector is added, so a URI that changes per
 * deploy leaves cached clients pointing at an address the server no longer
 * serves (seen as "failed to load connector" on mobile). Earlier versioned
 * addresses are kept as aliases for clients that cached them.
 */
const HISTORY_URI = "ui://runsense/workouts.html";
const DETAIL_URI = "ui://runsense/workout.html";
const LEGACY_RESOURCE_URIS = [1, 2, 3, 4].map(
  (n) => `ui://runsense/workouts.html?v=2026-10-16-${n}`,
);

/** Map tiles. Images only, so they go in resourceDomains, not connectDomains. */
const TILE_DOMAIN = "https://basemaps.cartocdn.com";

async function fetchPageHtml(path: string): Promise<string> {
  const res = await fetch(`${baseURL}${path}`, { cache: "no-store" });
  return res.text();
}

const widgetMeta = {
  ui: {
    // Claude web is borderless by default; be explicit for other hosts.
    prefersBorder: false,
    csp: {
      connectDomains: [baseURL],
      // assets.claude.ai serves Anthropic Sans for applyHostFonts.
      resourceDomains: [baseURL, "https://assets.claude.ai", TILE_DOMAIN],
    },
  },
};

function registerWidget(
  server: Parameters<typeof registerAppResource>[0],
  name: string,
  uri: string,
  path: string,
) {
  registerAppResource(
    server,
    name,
    uri,
    { mimeType: RESOURCE_MIME_TYPE },
    async () => ({
      contents: [
        {
          uri,
          mimeType: RESOURCE_MIME_TYPE,
          text: await fetchPageHtml(path),
          _meta: widgetMeta,
        },
      ],
    }),
  );
}

const readOnly = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
};

const handler = createMcpHandler(async (server) => {
  registerWidget(server, "workouts-widget", HISTORY_URI, "/");
  registerWidget(server, "workout-widget", DETAIL_URI, "/workout");
  LEGACY_RESOURCE_URIS.forEach((uri, i) =>
    registerWidget(server, `workouts-widget-legacy-${i + 1}`, uri, "/"),
  );

  registerAppTool(
    server,
    "list_recent_workouts",
    {
      title: "Recent workouts",
      description:
        "List the athlete's workouts from the last N days (default 7), newest first, with distance, time, pace or speed and heart rate, plus totals. Shows them in a widget. Each row carries the workout id to pass to get_workout.",
      inputSchema: {
        days: z
          .number()
          .int()
          .min(1)
          .max(90)
          .default(7)
          .describe("How many days back to include, counting today"),
      },
      annotations: readOnly,
      _meta: { ui: { resourceUri: HISTORY_URI } },
    },
    async ({ days }) => {
      const client = intervalsIcuClientFromEnv();
      const { range, workouts } = await getRecentWorkouts({ client, days });
      const totals = summarise(workouts);
      const rows = workouts.map(toWorkoutRow);
      const text =
        workouts.length === 0
          ? `No workouts between ${range.oldest} and ${range.newest}.`
          : [
              `${totals.count} workouts between ${range.oldest} and ${range.newest}: ` +
                `run ${totals.runKm} km, ride ${totals.rideKm} km, ${formatDuration(totals.movingSec)} moving.`,
              ...rows.map(
                (r) =>
                  `- ${r.day} ${r.date}: ${r.name} (${r.sport}, id ${r.id}) · ${r.meta}`,
              ),
            ].join("\n");
      return {
        content: [{ type: "text" as const, text }],
        structuredContent: { days, range, totals, workouts: rows },
      };
    },
  );

  registerAppTool(
    server,
    "get_workout",
    {
      title: "Workout detail",
      description:
        "One workout in full: distance, time, pace, heart rate, climb, cadence and load, the kilometre splits, the watch's laps and the GPS route. Shows a widget with the map, stats and splits. Use the id from list_recent_workouts.",
      inputSchema: {
        id: z.string().min(1).max(64).describe("The workout id"),
      },
      annotations: readOnly,
      _meta: { ui: { resourceUri: DETAIL_URI } },
    },
    async ({ id }) => {
      const client = intervalsIcuClientFromEnv();
      try {
        const detail = await getWorkoutDetail({ client, id });
        return {
          content: [
            { type: "text" as const, text: describeWorkoutDetail(detail) },
          ],
          structuredContent: {
            ...detail,
            heading: {
              ...toWorkoutRow(detail.workout),
              startTime: formatStartTime(detail.workout.startLocal),
            },
          },
        };
      } catch (err) {
        if (err instanceof IntervalsIcuError && err.status === 404) {
          return {
            content: [
              { type: "text" as const, text: `No workout with id ${id}.` },
            ],
            isError: true,
          };
        }
        throw err;
      }
    },
  );
});

export const GET = handler;
export const POST = handler;
