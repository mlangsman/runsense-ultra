import { describe, expect, it } from "vitest";
import activity from "@/src/sources/intervals-icu/__fixtures__/activity.json";
import {
  toWorkout,
  type IntervalsActivity,
} from "@/src/sources/intervals-icu/mapper";
import {
  buildWorkoutEmail,
  escapeHtml,
  openInClaudeUrl,
  workoutStats,
} from "./email";

const workout = toWorkout(activity as IntervalsActivity);
const detail = { workout, splits: [], laps: [], polyline: null };

describe("openInClaudeUrl", () => {
  it("opens Claude with the same prompt a tapped row would send", () => {
    const url = new URL(openInClaudeUrl(workout));
    expect(url.origin + url.pathname).toBe("https://claude.ai/new");
    expect(url.searchParams.get("q")).toBe(
      "Show me the Morning run on Sun 11 Oct in detail (workout i1001).",
    );
  });
});

describe("workoutStats", () => {
  it("lists a run's numbers with pace, in reading order", () => {
    expect(workoutStats(workout)).toEqual([
      { label: "Distance", value: "12.6 km" },
      { label: "Moving time", value: "1:08:16" },
      { label: "Pace", value: "5:26 /km" },
      { label: "Heart rate", value: "156 avg, 180 max" },
      { label: "Climb", value: "68 m" },
      { label: "Cadence", value: "157 spm" },
      { label: "Load", value: "104" },
    ]);
  });

  it("gives a ride its speed and leaves out what is missing", () => {
    const ride = {
      ...workout,
      sport: "ride" as const,
      distanceM: 30000,
      movingSec: 3600,
      avgHr: null,
      maxHr: null,
      elevationGainM: null,
      cadenceSpm: 85,
      trainingLoad: null,
    };
    expect(workoutStats(ride)).toEqual([
      { label: "Distance", value: "30.0 km" },
      { label: "Moving time", value: "1:00:00" },
      { label: "Speed", value: "30.0 km/h" },
      { label: "Cadence", value: "85 rpm" },
    ]);
  });
});

describe("buildWorkoutEmail", () => {
  it("puts the summary in the subject and everything in the text", () => {
    const email = buildWorkoutEmail({ detail, mapImageUrl: null });
    expect(email.subject).toBe(
      "Morning run: 12.6 km · 1:08:16 · 5:26 /km · HR 156",
    );
    expect(email.text).toContain("Sun 11 Oct · 08:15 · Run");
    expect(email.text).toContain("Pace: 5:26 /km");
    expect(email.text).toContain("Logged and in your history.");
    expect(email.text).toContain(openInClaudeUrl(workout));
  });

  it("renders the html with the link and no map when there is none", () => {
    const email = buildWorkoutEmail({ detail, mapImageUrl: null });
    expect(email.html).toContain(
      `href="${escapeHtml(openInClaudeUrl(workout))}"`,
    );
    expect(email.html).toContain(">Open in Claude</a>");
    expect(email.html).not.toContain("<img");
  });

  it("sends the button wherever it is told", () => {
    const email = buildWorkoutEmail({
      detail,
      mapImageUrl: null,
      openUrl: "https://runsense.example/open?q=hi",
    });
    expect(email.html).toContain('href="https://runsense.example/open?q=hi"');
    expect(email.text).toContain("https://runsense.example/open?q=hi");
    expect(email.html).not.toContain("claude.ai/new");
  });

  it("includes the map image when given one", () => {
    const email = buildWorkoutEmail({
      detail,
      mapImageUrl: "https://maps.example/route.png?a=1&b=2",
    });
    expect(email.html).toContain(
      '<img src="https://maps.example/route.png?a=1&amp;b=2"',
    );
  });

  it("escapes what came from the watch", () => {
    const named = {
      ...detail,
      workout: { ...workout, name: 'Hill <reps> & "tempo"' },
    };
    const email = buildWorkoutEmail({ detail: named, mapImageUrl: null });
    expect(email.html).toContain("Hill &lt;reps&gt; &amp; &quot;tempo&quot;");
    expect(email.html).not.toContain("<reps>");
    expect(email.subject).toContain('Hill <reps> & "tempo"');
  });
});
