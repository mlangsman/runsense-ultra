/**
 * Builds a TCX file (Garmin's Training Center XML) from a plain activity
 * shape, so a ride recorded on another platform can be uploaded to
 * intervals.icu. Pure TypeScript: no I/O.
 */

export type TcxSport = "Biking" | "Running" | "Other";

export interface TcxSample {
  /** Seconds since the start. */
  offsetSec: number;
  heartRateBpm?: number | null;
  cadenceRpm?: number | null;
  watts?: number | null;
  /** Cumulative metres from the start. */
  distanceM?: number | null;
  speedMps?: number | null;
}

export interface TcxActivity {
  sport: TcxSport;
  /** ISO 8601 in UTC, e.g. "2026-10-18T16:58:51Z". */
  startUtc: string;
  durationSec: number;
  distanceM: number | null;
  calories: number | null;
  notes?: string | null;
  samples: TcxSample[];
}

const TCX_NS = "http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2";
const EXT_NS = "http://www.garmin.com/xmlschemas/ActivityExtension/v2";

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const isNum = (v: number | null | undefined): v is number =>
  typeof v === "number" && Number.isFinite(v);

const whole = (v: number) => String(Math.max(0, Math.round(v)));
const fixed = (v: number, dp: number) => v.toFixed(dp);

function isoAt(startUtc: string, offsetSec: number): string {
  return new Date(Date.parse(startUtc) + offsetSec * 1000).toISOString();
}

function trackpoint(startUtc: string, s: TcxSample): string {
  const parts = [`<Time>${isoAt(startUtc, s.offsetSec)}</Time>`];
  if (isNum(s.distanceM)) {
    parts.push(`<DistanceMeters>${fixed(s.distanceM, 1)}</DistanceMeters>`);
  }
  if (isNum(s.heartRateBpm) && s.heartRateBpm > 0) {
    parts.push(
      `<HeartRateBpm><Value>${whole(s.heartRateBpm)}</Value></HeartRateBpm>`,
    );
  }
  if (isNum(s.cadenceRpm)) {
    // The schema caps cadence at 254.
    parts.push(`<Cadence>${whole(Math.min(s.cadenceRpm, 254))}</Cadence>`);
  }
  const ext: string[] = [];
  if (isNum(s.speedMps))
    ext.push(`<ns3:Speed>${fixed(s.speedMps, 2)}</ns3:Speed>`);
  if (isNum(s.watts)) ext.push(`<ns3:Watts>${whole(s.watts)}</ns3:Watts>`);
  if (ext.length > 0) {
    parts.push(`<Extensions><ns3:TPX>${ext.join("")}</ns3:TPX></Extensions>`);
  }
  return `<Trackpoint>${parts.join("")}</Trackpoint>`;
}

/** The whole file as a string. Elements follow the schema's required order. */
export function buildTcx(a: TcxActivity): string {
  const start = new Date(Date.parse(a.startUtc)).toISOString();
  const lap = [
    `<TotalTimeSeconds>${fixed(a.durationSec, 1)}</TotalTimeSeconds>`,
    `<DistanceMeters>${fixed(a.distanceM ?? 0, 1)}</DistanceMeters>`,
    `<Calories>${whole(a.calories ?? 0)}</Calories>`,
    `<Intensity>Active</Intensity>`,
    `<TriggerMethod>Manual</TriggerMethod>`,
    `<Track>${a.samples.map((s) => trackpoint(start, s)).join("")}</Track>`,
  ].join("");
  const notes = a.notes ? `<Notes>${escapeXml(a.notes)}</Notes>` : "";
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<TrainingCenterDatabase xmlns="${TCX_NS}" xmlns:ns3="${EXT_NS}">` +
    `<Activities><Activity Sport="${a.sport}"><Id>${start}</Id>` +
    `<Lap StartTime="${start}">${lap}</Lap>${notes}</Activity></Activities>` +
    `</TrainingCenterDatabase>`
  );
}
