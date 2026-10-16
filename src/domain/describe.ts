/**
 * The plain-text account of a workout that goes to the model alongside the
 * widget. Compact on purpose: every line costs context.
 */

import type { Lap, Workout } from "./workout";
import type { Split } from "./splits";
import { toWorkoutRow, type WorkoutRow } from "./summary";
import {
  formatDistanceKm,
  formatDuration,
  formatPace,
  paceSecPerKm,
} from "./workout";

export interface WorkoutDetailLike {
  workout: Workout;
  splits: Split[];
  laps: Lap[];
  polyline: string | null;
}

export function formatStartTime(startLocal: string): string {
  return startLocal.slice(11, 16);
}

export function describeWorkoutDetail({
  workout: w,
  splits,
  laps,
  polyline,
}: WorkoutDetailLike): string {
  const row = toWorkoutRow(w);
  const facts: string[] = [];
  if (w.distanceM) facts.push(`${formatDistanceKm(w.distanceM)} in`);
  facts.push(
    `${formatDuration(w.movingSec)} moving (${formatDuration(w.elapsedSec)} elapsed)`,
  );
  const line = [facts.join(" ")];
  if (w.distanceM && w.sport === "run") {
    line.push(`${formatPace(paceSecPerKm(w.distanceM, w.movingSec))} /km`);
  }
  if (w.avgHr != null) {
    line.push(`HR ${w.avgHr} avg${w.maxHr != null ? `, ${w.maxHr} max` : ""}`);
  }
  if (w.elevationGainM != null)
    line.push(`${Math.round(w.elevationGainM)} m climb`);
  if (w.cadenceSpm != null) line.push(`${w.cadenceSpm} spm`);
  if (w.trainingLoad != null) line.push(`load ${w.trainingLoad}`);

  const out = [
    `${w.name} (${w.sport}), ${row.day} ${row.date} ${formatStartTime(w.startLocal)}: ${line.join(", ")}.`,
  ];
  if (splits.length > 0) {
    out.push(
      `Splits: ${splits
        .map((s) => {
          const km =
            s.distanceM >= 999.5
              ? `${s.index} km`
              : `last ${(s.distanceM / 1000).toFixed(1)} km`;
          return `${km} ${formatPace(s.paceSecPerKm)}${s.avgHr != null ? ` HR ${s.avgHr}` : ""}`;
        })
        .join(" · ")}`,
    );
  }
  if (laps.length > 0) {
    out.push(
      `Laps (${laps.length}): ${laps
        .map((l) => {
          const parts = [String(l.index)];
          if (l.name) parts.push(l.name);
          if (l.distanceM) parts.push(formatDistanceKm(l.distanceM));
          parts.push(
            l.distanceM
              ? formatPace(paceSecPerKm(l.distanceM, l.movingSec))
              : formatDuration(l.movingSec),
          );
          if (l.avgHr != null) parts.push(`HR ${l.avgHr}`);
          return parts.join(" ");
        })
        .join(" · ")}`,
    );
  }
  if (polyline) out.push("GPS route available; the widget shows the map.");
  return out.join("\n");
}

/**
 * What the history widget posts to the chat when a row is tapped. The
 * conversation is the navigation: Claude reads this, calls get_workout and
 * the detail widget renders. The id makes the call unambiguous.
 */
export function openWorkoutMessage(row: WorkoutRow): string {
  return `Show me the ${row.name} on ${row.day} ${row.date} in detail (workout ${row.id}).`;
}
