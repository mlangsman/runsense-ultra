#!/usr/bin/env node
/**
 * Capture one workout's detail from intervals.icu as anonymised test fixtures.
 *
 * Run locally, where the key lives:
 *   INTERVALS_ICU_API_KEY=... node scripts/capture-fixture.mjs i12345678
 *
 * Writes activity.json, streams.json and intervals.json into the fixtures
 * folder with the id, name and device wiped and the GPS track shifted by a
 * random offset, so the shape of a real response is in the repo but no
 * personal data is. Plain Node, no dependencies, no build step.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const [id] = process.argv.slice(2);
const apiKey = process.env.INTERVALS_ICU_API_KEY;
if (!id || !apiKey) {
  console.error(
    "Usage: INTERVALS_ICU_API_KEY=... node scripts/capture-fixture.mjs <activity id>",
  );
  process.exit(1);
}

const base = "https://intervals.icu/api/v1";
const headers = {
  authorization: `Basic ${Buffer.from(`API_KEY:${apiKey}`).toString("base64")}`,
  accept: "application/json",
};
const get = async (path) => {
  const res = await fetch(`${base}${path}`, { headers });
  if (!res.ok) throw new Error(`${res.status} for ${path}`);
  return res.json();
};

const [activity, streams, intervals] = await Promise.all([
  get(`/activity/${id}`),
  get(
    `/activity/${id}/streams?types=time,distance,latlng,heartrate,altitude,cadence,velocity_smooth`,
  ),
  get(`/activity/${id}/intervals`),
]);

const FAKE_ID = "i1001";
const shift = [Math.random() * 2 - 1, Math.random() * 2 - 1]; // degrees

const keep = [
  "type",
  "start_date_local",
  "start_date",
  "timezone",
  "distance",
  "moving_time",
  "elapsed_time",
  "total_elevation_gain",
  "average_heartrate",
  "max_heartrate",
  "icu_training_load",
  "average_speed",
  "average_cadence",
  "pace",
  "trainer",
  "source",
];
const slimActivity = { id: FAKE_ID, name: "Morning run" };
for (const k of keep) slimActivity[k] = activity[k] ?? null;
slimActivity.device_name = activity.device_name ? "Forerunner" : null;

const slimStreams = (Array.isArray(streams) ? streams : []).map((s) => ({
  type: s.type,
  data:
    s.type === "latlng"
      ? s.data.map((p) =>
          Array.isArray(p)
            ? [round(p[0] + shift[0], 6), round(p[1] + shift[1], 6)]
            : p,
        )
      : s.data,
}));

const slimIntervals = {
  id: FAKE_ID,
  icu_intervals: (intervals.icu_intervals ?? []).map((i) => {
    const copy = { ...i };
    delete copy.segment;
    return copy;
  }),
  icu_groups: intervals.icu_groups ?? [],
};

const dir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../src/sources/intervals-icu/__fixtures__",
);
writeFileSync(
  join(dir, "activity.json"),
  JSON.stringify(slimActivity, null, 2),
);
writeFileSync(join(dir, "streams.json"), JSON.stringify(slimStreams));
writeFileSync(
  join(dir, "intervals.json"),
  JSON.stringify(slimIntervals, null, 2),
);
console.log(
  `Wrote fixtures: ${slimStreams.map((s) => s.type).join(", ")} streams, ${slimIntervals.icu_intervals.length} intervals. Check the diff before committing.`,
);

function round(n, places) {
  return Math.round(n * 10 ** places) / 10 ** places;
}
