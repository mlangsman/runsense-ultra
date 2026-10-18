/**
 * The coach's one line on a finished workout, from the numbers alone. Plain
 * observations about pacing, never about health: the coach does not give
 * medical advice (see PRODUCT.md). Goals and history arrive in Phase 3 and
 * will shape this; for now it is deterministic and conservative.
 */

import type { Split } from "./splits";
import type { Workout } from "./workout";

/** Below this the two halves count as the same pace. */
const EVEN_WITHIN_SEC_PER_KM = 5;
/** Slowing by more than this in the second half is worth a mention. */
const FADE_SEC_PER_KM = 10;
/** Fewer full splits than this and halves mean little. */
const MIN_SPLITS = 4;

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export function coachLine({
  workout,
  splits,
}: {
  workout: Workout;
  splits: Split[];
}): string {
  const full = splits.filter((s) => s.distanceM >= 999.5);
  if (workout.sport !== "run" || full.length < MIN_SPLITS) {
    return "Logged and in your history.";
  }
  const half = Math.floor(full.length / 2);
  const first = mean(full.slice(0, half).map((s) => s.paceSecPerKm));
  const second = mean(full.slice(-half).map((s) => s.paceSecPerKm));
  const diff = Math.round(first - second);
  if (diff >= EVEN_WITHIN_SEC_PER_KM) {
    return `A negative split: the second half was ${diff} s/km quicker than the first.`;
  }
  if (diff <= -FADE_SEC_PER_KM) {
    return `You slowed by ${-diff} s/km in the second half. Worth noting how it felt.`;
  }
  return `Even pacing: the two halves were within ${Math.abs(diff)} s/km of each other.`;
}
