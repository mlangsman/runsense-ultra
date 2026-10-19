import { describe, expect, it } from "vitest";
import activity from "@/src/sources/intervals-icu/__fixtures__/activity.json";
import {
  toWorkout,
  type IntervalsActivity,
} from "@/src/sources/intervals-icu/mapper";
import {
  claudeAppUrl,
  claudeWebUrl,
  openPageUrl,
  shouldTryApp,
  workoutPrompt,
} from "./openLinks";

const workout = toWorkout(activity as IntervalsActivity);
const prompt =
  "Show me the Morning run on Sun 11 Oct in detail (workout i1001).";

describe("open links", () => {
  it("builds the prompt a tapped row would send", () => {
    expect(workoutPrompt(workout)).toBe(prompt);
  });

  it("encodes the prompt into the web, app and page links", () => {
    expect(claudeWebUrl(prompt)).toBe(
      `https://claude.ai/new?q=${encodeURIComponent(prompt)}`,
    );
    expect(claudeAppUrl(prompt)).toBe(
      `claude://claude.ai/new?q=${encodeURIComponent(prompt)}`,
    );
    const page = new URL(openPageUrl("https://runsense.example/", prompt));
    expect(page.origin + page.pathname).toBe("https://runsense.example/open");
    expect(page.searchParams.get("q")).toBe(prompt);
  });

  it("tries the app on desktop browsers only", () => {
    expect(shouldTryApp("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)")).toBe(
      true,
    );
    expect(shouldTryApp("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe(
      true,
    );
    expect(
      shouldTryApp("Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X)"),
    ).toBe(false);
    expect(shouldTryApp("Mozilla/5.0 (Linux; Android 16; Pixel 10)")).toBe(
      false,
    );
  });
});
