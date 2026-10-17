/**
 * The query for an Apple Maps Web Snapshot of a route: one static image with
 * the track drawn by Apple, framed around the track with a margin. Pure
 * string building; signing the request is the source's job.
 * Reference: developer.apple.com/documentation/snapshots
 */

import { encodePolyline, type LatLng } from "./route";

export type ColorScheme = "light" | "dark";

export interface SnapshotOptions {
  track: LatLng[];
  colorScheme: ColorScheme;
  /** CSS pixels; Apple allows 50 to 640 on each side. */
  width?: number;
  height?: number;
  /** Colours as hex without the `#`, the form Apple's examples use. */
  routeColor?: string;
  startColor?: string;
  endColor?: string;
}

/** Apple's limit on each side of a snapshot, in CSS pixels. */
export const MAX_SIDE = 640;
/** Room between the track's bounds and the frame, as a fraction of the bounds. */
const MARGIN = 0.25;
/** Never frame tighter than this (degrees, about 300 m), so a short track still shows its streets. */
const MIN_SPAN_DEG = 0.003;

/**
 * The snapshot query string without credentials, parameters URL-encoded in a
 * fixed order. Apple signs the exact string, so the order must never change
 * between building and signing.
 */
export function snapshotQuery({
  track,
  colorScheme,
  width = MAX_SIDE,
  height = 320,
  routeColor = "D97757",
  startColor = colorScheme === "dark" ? "7AB948" : "275B19",
  endColor = routeColor,
}: SnapshotOptions): string {
  if (track.length < 2) throw new Error("a snapshot needs at least two points");
  const { center, span } = frame(track);
  const start = track[0];
  const end = track[track.length - 1];
  const params = new URLSearchParams({
    center: point(center),
    spn: `${span[0].toFixed(5)},${span[1].toFixed(5)}`,
    size: `${clampSide(width)}x${clampSide(height)}`,
    scale: "2",
    t: "standard",
    colorScheme,
    poi: "0",
    overlays: JSON.stringify([
      {
        type: "polyline",
        points: encodePolyline(track),
        strokeColor: routeColor,
        lineWidth: 3,
      },
    ]),
    annotations: JSON.stringify([
      { point: point(start), markerStyle: "dot", color: startColor },
      { point: point(end), markerStyle: "dot", color: endColor },
    ]),
  });
  return params.toString();
}

function point([lat, lng]: LatLng): string {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

function clampSide(px: number): number {
  return Math.min(MAX_SIDE, Math.max(50, Math.round(px)));
}

/** Centre and span (lat delta, lng delta) that hold the track with a margin. */
function frame(track: LatLng[]): { center: LatLng; span: [number, number] } {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const [lat, lng] of track) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  const latSpan = Math.max(MIN_SPAN_DEG, (maxLat - minLat) * (1 + 2 * MARGIN));
  const lngSpan = Math.max(MIN_SPAN_DEG, (maxLng - minLng) * (1 + 2 * MARGIN));
  return {
    center: [(minLat + maxLat) / 2, (minLng + maxLng) / 2],
    span: [latSpan, lngSpan],
  };
}
