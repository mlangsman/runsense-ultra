#!/usr/bin/env node
/**
 * Capture one Peloton ride as anonymised test fixtures, so the shape of a
 * real response is in the repo but no personal data is.
 *
 * Run locally with the account's credentials:
 *   PELOTON_USERNAME=... PELOTON_PASSWORD=... node scripts/capture-peloton-fixture.mjs [workout id]
 *
 * Without an id it takes the latest ride. Writes workout.json and
 * performance-graph.json into src/sources/peloton/__fixtures__ with the ids,
 * user fields and start time replaced and the graph thinned to every 5th
 * second. Plain Node, no dependencies, no build step.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const base = "https://api.onepeloton.com";
const { PELOTON_USERNAME: username, PELOTON_PASSWORD: password } = process.env;
if (!username || !password) {
  console.error("Set PELOTON_USERNAME and PELOTON_PASSWORD");
  process.exit(1);
}
const [wantedId] = process.argv.slice(2);

const common = { accept: "application/json", "peloton-platform": "web" };
const tokenRes = await fetch("https://auth.onepeloton.com/oauth/token", {
  method: "POST",
  headers: { ...common, "content-type": "application/json" },
  body: JSON.stringify({
    grant_type: "password",
    client_id: "mgsmWCD0A8Qn6uz6mmqI6qeBNHH9IPwS",
    scope: "offline_access openid",
    username,
    password,
  }),
});
if (!tokenRes.ok) throw new Error(`login failed with ${tokenRes.status}`);
const { access_token } = await tokenRes.json();
const headers = { ...common, authorization: `Bearer ${access_token}` };
const get = async (path) => {
  const res = await fetch(`${base}${path}`, { headers });
  if (!res.ok) throw new Error(`${res.status} for ${path}`);
  return res.json();
};
const { id: user_id } = await get("/api/me");

let workout;
if (wantedId) {
  workout = await get(`/api/workout/${wantedId}?joins=ride,ride.instructor`);
} else {
  const page = await get(
    `/api/user/${user_id}/workouts?limit=20&page=0&sort_by=-created&joins=ride,ride.instructor`,
  );
  workout = page.data.find((w) => w.fitness_discipline === "cycling");
  if (!workout) throw new Error("no ride in the latest 20 workouts");
}
const graph = await get(
  `/api/workout/${workout.id}/performance_graph?every_n=5`,
);

// Keep the shape, drop the person.
const keep = [
  "start_time",
  "end_time",
  "fitness_discipline",
  "status",
  "timezone",
  "title",
  "name",
  "total_work",
  "has_pedaling_metrics",
  "device_type",
];
const anonymised = Object.fromEntries(
  keep.filter((k) => k in workout).map((k) => [k, workout[k]]),
);
anonymised.id = "wk-fixture";
const shift = 1792346331 - workout.start_time;
anonymised.start_time += shift;
if (anonymised.end_time != null) anonymised.end_time += shift;
if (workout.ride) {
  anonymised.ride = {
    title: workout.ride.title,
    duration: workout.ride.duration,
    instructor: workout.ride.instructor ? { name: "Fixture Instructor" } : null,
  };
}

const dir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../src/sources/peloton/__fixtures__",
);
const write = (name, data) =>
  writeFileSync(join(dir, name), JSON.stringify(data, null, 2) + "\n");
write("workout.json", anonymised);
write("performance-graph.json", {
  duration: graph.duration,
  seconds_since_pedaling_start: graph.seconds_since_pedaling_start,
  metrics: graph.metrics,
  summaries: graph.summaries,
});
console.log(`captured ${workout.fitness_discipline} workout into ${dir}`);
