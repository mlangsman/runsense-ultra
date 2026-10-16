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

const UI_VERSION = "2026-10-16-2";
const RESOURCE_URI = `ui://runsense/workouts.html?v=${UI_VERSION}`;

async function fetchPageHtml(path: string): Promise<string> {
  const res = await fetch(`${baseURL}${path}`);
  return res.text();
}

const handler = createMcpHandler(async (server) => {
  registerAppResource(
    server,
    "workouts-widget",
    RESOURCE_URI,
    { mimeType: RESOURCE_MIME_TYPE },
    async () => ({
      contents: [
        {
          uri: RESOURCE_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: await fetchPageHtml("/"),
          _meta: {
            ui: {
              csp: {
                connectDomains: [baseURL],
                resourceDomains: [baseURL],
              },
            },
          },
        },
      ],
    }),
  );

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
