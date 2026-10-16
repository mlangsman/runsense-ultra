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
import { getRecentWorkouts } from "@/src/services/recentWorkouts";
import { intervalsIcuClientFromEnv } from "@/src/sources/intervals-icu/client";

/**
 * The widget lives at ONE stable address. Claude caches a connector's tool
 * list and widget HTML when the connector is added, so a URI that changes per
 * deploy leaves cached clients pointing at an address the server no longer
 * serves (seen as "failed to load connector" on mobile). Earlier versioned
 * addresses are kept as aliases for clients that cached them.
 */
const RESOURCE_URI = "ui://runsense/workouts.html";
const LEGACY_RESOURCE_URIS = [1, 2, 3, 4].map(
  (n) => `ui://runsense/workouts.html?v=2026-10-16-${n}`,
);

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
      resourceDomains: [baseURL, "https://assets.claude.ai"],
    },
  },
};

const handler = createMcpHandler(async (server) => {
  for (const [index, uri] of [
    RESOURCE_URI,
    ...LEGACY_RESOURCE_URIS,
  ].entries()) {
    registerAppResource(
      server,
      index === 0 ? "workouts-widget" : `workouts-widget-legacy-${index}`,
      uri,
      { mimeType: RESOURCE_MIME_TYPE },
      async () => ({
        contents: [
          {
            uri,
            mimeType: RESOURCE_MIME_TYPE,
            text: await fetchPageHtml("/"),
            _meta: widgetMeta,
          },
        ],
      }),
    );
  }

  registerAppTool(
    server,
    "list_recent_workouts",
    {
      title: "Recent workouts",
      description:
        "List the athlete's workouts from the last N days (default 7), newest first, with distance, time, pace or speed and heart rate, plus totals. Shows them in a widget.",
      inputSchema: {
        days: z
          .number()
          .int()
          .min(1)
          .max(90)
          .default(7)
          .describe("How many days back to include, counting today"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
      _meta: { ui: { resourceUri: RESOURCE_URI } },
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
                  `- ${r.day} ${r.date}: ${r.name} (${r.sport}) · ${r.meta}`,
              ),
            ].join("\n");
      return {
        content: [{ type: "text" as const, text }],
        structuredContent: { days, range, totals, workouts: rows },
      };
    },
  );
});

export const GET = handler;
export const POST = handler;
