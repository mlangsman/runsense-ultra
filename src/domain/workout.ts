/**
 * The canonical workout model and the formatting used everywhere a number is
 * shown. Pure TypeScript: no I/O, no framework imports.
 */

export type Sport = "run" | "ride" | "swim" | "strength" | "walk" | "other";

export interface Workout {
  /** The source's id (intervals.icu for now). */
  id: string;
  sport: Sport;
  name: string;
  /** Local start time as ISO without a zone, e.g. "2026-09-22T06:42:00". */
  startLocal: string;
  timezone: string;
  distanceM: number | null;
  movingSec: number;
  elapsedSec: number;
  elevationGainM: number | null;
  avgHr: number | null;
  maxHr: number | null;
  /** The source's training load figure, when it has one. */
  trainingLoad: number | null;
}

const MISSING = "–";

export function paceSecPerKm(
  distanceM: number | null,
  movingSec: number,
): number | null {
  if (!distanceM || distanceM <= 0) return null;
  return movingSec / (distanceM / 1000);
}

export function formatPace(secPerKm: number | null): string {
  if (secPerKm == null || !Number.isFinite(secPerKm)) return MISSING;
  const total = Math.round(secPerKm);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatDuration(totalSec: number): string {
  const total = Math.round(totalSec);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const mmss = `${hours > 0 ? String(minutes).padStart(2, "0") : minutes}:${String(seconds).padStart(2, "0")}`;
  return hours > 0 ? `${hours}:${mmss}` : mmss;
}

export function formatDistanceKm(distanceM: number | null): string {
  if (distanceM == null) return MISSING;
  return `${(distanceM / 1000).toFixed(1)} km`;
}
