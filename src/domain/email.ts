/**
 * The email a runner gets when a workout syncs: the summary, the map when
 * there is one, the coach's line and a link that opens Claude on the run.
 * Pure string building, no I/O. Sending is a source's job.
 */

import { coachLine } from "./coachLine";
import type { WorkoutDetailLike } from "./describe";
import { formatStartTime, openWorkoutMessage } from "./describe";
import { toWorkoutRow, speedKmh } from "./summary";
import {
  formatDistanceKm,
  formatDuration,
  formatPace,
  paceSecPerKm,
  type Workout,
} from "./workout";

export interface Email {
  subject: string;
  /** Plain-text alternative; every client can read it. */
  text: string;
  html: string;
}

export interface WorkoutEmailInput {
  detail: WorkoutDetailLike;
  /** A static image of the route, or null to leave the map out. */
  mapImageUrl: string | null;
}

export interface Stat {
  label: string;
  value: string;
}

/** The brand accent, the same terracotta the widgets use. */
const ACCENT = "#D97757";

const SPORT_LABEL: Record<Workout["sport"], string> = {
  run: "Run",
  ride: "Ride",
  swim: "Swim",
  strength: "Strength",
  walk: "Walk",
  other: "Workout",
};

/**
 * The link that opens Claude with the prompt pre-filled. Claude's `new`
 * page takes the prompt as `q`; the user sends it and the detail widget
 * renders. Documented for desktop and web; iPhone is still to be checked.
 */
export function openInClaudeUrl(workout: Workout): string {
  const prompt = openWorkoutMessage(toWorkoutRow(workout));
  return `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
}

export function workoutStats(w: Workout): Stat[] {
  const stats: Stat[] = [];
  if (w.distanceM)
    stats.push({ label: "Distance", value: formatDistanceKm(w.distanceM) });
  stats.push({ label: "Moving time", value: formatDuration(w.movingSec) });
  if (w.distanceM && w.sport === "run") {
    stats.push({
      label: "Pace",
      value: `${formatPace(paceSecPerKm(w.distanceM, w.movingSec))} /km`,
    });
  } else if (w.distanceM && w.sport === "ride") {
    stats.push({ label: "Speed", value: speedKmh(w.distanceM, w.movingSec) });
  }
  if (w.avgHr != null) {
    stats.push({
      label: "Heart rate",
      value: `${w.avgHr} avg${w.maxHr != null ? `, ${w.maxHr} max` : ""}`,
    });
  }
  if (w.elevationGainM != null) {
    stats.push({ label: "Climb", value: `${Math.round(w.elevationGainM)} m` });
  }
  if (w.cadenceSpm != null) {
    stats.push({
      label: "Cadence",
      value: `${w.cadenceSpm} ${w.sport === "ride" ? "rpm" : "spm"}`,
    });
  }
  if (w.trainingLoad != null) {
    stats.push({ label: "Load", value: String(w.trainingLoad) });
  }
  return stats;
}

export function buildWorkoutEmail({
  detail,
  mapImageUrl,
}: WorkoutEmailInput): Email {
  const { workout } = detail;
  const row = toWorkoutRow(workout);
  const when = `${row.day} ${row.date} · ${formatStartTime(workout.startLocal)} · ${SPORT_LABEL[workout.sport]}`;
  const stats = workoutStats(workout);
  const coach = coachLine(detail);
  const openUrl = openInClaudeUrl(workout);
  const subject = `${workout.name}: ${row.meta}`;

  const text = [
    workout.name,
    when,
    "",
    ...stats.map((s) => `${s.label}: ${s.value}`),
    "",
    coach,
    "",
    `Open in Claude to say how it felt: ${openUrl}`,
    "",
    FOOTER,
  ].join("\n");

  return {
    subject,
    text,
    html: renderHtml({ workout, when, stats, coach, openUrl, mapImageUrl }),
  };
}

const FOOTER = "Sent by Runsense because a workout synced from intervals.icu.";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderHtml({
  workout,
  when,
  stats,
  coach,
  openUrl,
  mapImageUrl,
}: {
  workout: Workout;
  when: string;
  stats: Stat[];
  coach: string;
  openUrl: string;
  mapImageUrl: string | null;
}): string {
  const font =
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const muted = "color:#6b6b6b";
  const map = mapImageUrl
    ? `<img src="${escapeHtml(mapImageUrl)}" alt="Map of the route" width="100%" style="display:block;width:100%;border-radius:8px;margin:0 0 16px">`
    : "";
  const rows = stats
    .map(
      (s) =>
        `<tr><td style="padding:6px 0;${muted};font-size:14px">${escapeHtml(s.label)}</td>` +
        `<td style="padding:6px 0;text-align:right;font-weight:600;font-size:14px">${escapeHtml(s.value)}</td></tr>`,
    )
    .join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(workout.name)}</title></head>
<body style="margin:0;padding:24px 16px;background:#f5f4ef;${font};color:#1a1a1a;font-size:16px;line-height:1.4">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px">
<p style="margin:0 0 4px;${muted};font-size:14px">${escapeHtml(when)}</p>
<h1 style="margin:0 0 16px;font-size:20px;font-weight:600">${escapeHtml(workout.name)}</h1>
${map}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 16px">${rows}</table>
<p style="margin:0 0 20px">${escapeHtml(coach)}</p>
<p style="margin:0 0 8px"><a href="${escapeHtml(openUrl)}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;font-weight:600;padding:10px 18px;border-radius:8px">Open in Claude</a></p>
<p style="margin:0 0 24px;${muted};font-size:14px">Claude will ask how it felt.</p>
<p style="margin:0;${muted};font-size:12px">${FOOTER}</p>
</div></body></html>`;
}
