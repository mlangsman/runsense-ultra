/**
 * Splits: the run cut into equal distances, computed from the recorded
 * streams. Laps are different: the watch's own markers, read from the source.
 */

export interface Streams {
  /** Seconds since the start, one per sample. */
  time: number[];
  /** Metres since the start, one per sample. */
  distance: number[];
  heartrate?: number[];
  /** Metres above sea level. */
  altitude?: number[];
}

export interface Split {
  /** 1-based. */
  index: number;
  distanceM: number;
  sec: number;
  paceSecPerKm: number;
  avgHr: number | null;
  elevationGainM: number | null;
}

const MIN_REMAINDER_M = 100;

export function computeSplits(streams: Streams, splitM = 1000): Split[] {
  const { time, distance, heartrate, altitude } = streams;
  const n = Math.min(time.length, distance.length);
  const splits: Split[] = [];
  if (n < 2 || distance[n - 1] <= 0) return splits;

  let startSec = time[0];
  let startM = 0;
  let hrSum = 0;
  let hrCount = 0;
  let climb = 0;
  let prevAlt = altitude?.[0];

  const push = (endM: number, endSec: number) => {
    const d = endM - startM;
    const s = endSec - startSec;
    splits.push({
      index: splits.length + 1,
      distanceM: d,
      sec: s,
      paceSecPerKm: d > 0 ? s / (d / 1000) : 0,
      avgHr: hrCount > 0 ? Math.round(hrSum / hrCount) : null,
      elevationGainM: altitude ? climb : null,
    });
    startM = endM;
    startSec = endSec;
    hrSum = hrCount = climb = 0;
  };

  for (let i = 1; i < n; i++) {
    const hr = heartrate?.[i];
    if (typeof hr === "number" && hr > 0) {
      hrSum += hr;
      hrCount++;
    }
    const alt = altitude?.[i];
    if (typeof alt === "number" && typeof prevAlt === "number") {
      if (alt > prevAlt) climb += alt - prevAlt;
    }
    prevAlt = alt;

    const boundary = startM + splitM;
    if (distance[i] >= boundary) {
      const span = distance[i] - distance[i - 1];
      const fraction = span > 0 ? (boundary - distance[i - 1]) / span : 1;
      const crossSec = time[i - 1] + fraction * (time[i] - time[i - 1]);
      push(boundary, crossSec);
    }
  }

  if (distance[n - 1] - startM >= MIN_REMAINDER_M) {
    push(distance[n - 1], time[n - 1]);
  }
  return splits;
}
