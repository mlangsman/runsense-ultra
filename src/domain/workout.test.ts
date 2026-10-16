import { describe, expect, it } from "vitest";
import {
  formatDistanceKm,
  formatDuration,
  formatPace,
  paceSecPerKm,
} from "./workout";

describe("paceSecPerKm", () => {
  it("derives seconds per kilometre from distance and moving time", () => {
    expect(paceSecPerKm(10_400, 2_910)).toBeCloseTo(279.8, 1);
  });

  it("returns null when there is no distance", () => {
    expect(paceSecPerKm(0, 2_700)).toBeNull();
    expect(paceSecPerKm(null, 2_700)).toBeNull();
  });
});

describe("formatPace", () => {
  it("formats whole minutes and zero-padded seconds", () => {
    expect(formatPace(280)).toBe("4:40");
    expect(formatPace(305)).toBe("5:05");
  });

  it("rounds to the nearest second", () => {
    expect(formatPace(279.8)).toBe("4:40");
    expect(formatPace(279.4)).toBe("4:39");
  });

  it("rolls 60 seconds into the next minute after rounding", () => {
    expect(formatPace(299.6)).toBe("5:00");
  });

  it("returns a dash for a missing pace", () => {
    expect(formatPace(null)).toBe("–");
  });
});

describe("formatDuration", () => {
  it("uses h:mm:ss above an hour and m:ss below", () => {
    expect(formatDuration(5_465)).toBe("1:31:05");
    expect(formatDuration(2_910)).toBe("48:30");
    expect(formatDuration(59)).toBe("0:59");
  });
});

describe("formatDistanceKm", () => {
  it("shows one decimal place with the unit", () => {
    expect(formatDistanceKm(10_400)).toBe("10.4 km");
    expect(formatDistanceKm(5_000)).toBe("5.0 km");
  });

  it("returns a dash for a missing distance", () => {
    expect(formatDistanceKm(null)).toBe("–");
  });
});
