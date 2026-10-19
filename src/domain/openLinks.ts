/**
 * Links that open Claude on a workout. Three forms of one prompt:
 *
 * - web:  https://claude.ai/new?q=…  works everywhere, lands in a browser.
 * - app:  claude://claude.ai/new?q=…  opens the Claude desktop app directly;
 *         documented by Anthropic for macOS, Windows and Linux. Email
 *         clients mostly strip custom schemes, so it never goes in an email.
 * - page: <our site>/open?q=…  an https link the email can carry; the page
 *         tries the app link and falls back to the web one.
 *
 * Both Claude forms prefill the prompt; the user still presses send. That is
 * deliberate on Anthropic's side (a one-click prompt flaw was fixed in 2026).
 */

import { openWorkoutMessage } from "./describe";
import { toWorkoutRow } from "./summary";
import type { Workout } from "./workout";

/** Longer than any prompt we build; keeps the open page from relaying junk. */
export const MAX_PROMPT_LENGTH = 500;

export function claudeWebUrl(prompt: string): string {
  return `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
}

export function claudeAppUrl(prompt: string): string {
  return `claude://claude.ai/new?q=${encodeURIComponent(prompt)}`;
}

/** The https link for an email: our open page carrying the prompt. */
export function openPageUrl(baseUrl: string, prompt: string): string {
  return `${baseUrl.replace(/\/$/, "")}/open?q=${encodeURIComponent(prompt)}`;
}

/** The prompt a tapped history row sends: one phrase for "show me this run". */
export function workoutPrompt(workout: Workout): string {
  return openWorkoutMessage(toWorkoutRow(workout));
}

/**
 * Whether to try the desktop app link at all. Phones get the web link
 * straight away: the claude:// scheme is documented for chat on desktop
 * only, and a scheme the phone cannot handle shows an error dialog.
 */
export function shouldTryApp(userAgent: string): boolean {
  return !/iPhone|iPad|iPod|Android/i.test(userAgent);
}
