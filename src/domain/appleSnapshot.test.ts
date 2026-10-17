import { describe, expect, it } from "vitest";
import { snapshotQuery } from "./appleSnapshot";
import { decodePolyline, type LatLng } from "./route";

const track: LatLng[] = [
  [51.5, -0.12],
  [51.505, -0.11],
  [51.51, -0.1],
];

describe("snapshotQuery", () => {
  const params = new URLSearchParams(
    snapshotQuery({ track, colorScheme: "dark" }),
  );

  it("frames the track's bounds with a margin around them", () => {
    expect(params.get("center")).toBe("51.50500,-0.11000");
    // Bounds are 0.01 deg of latitude and 0.02 of longitude; a quarter margin on each side.
    expect(params.get("spn")).toBe("0.01500,0.03000");
  });

  it("asks for a retina image of the default size in the given scheme", () => {
    expect(params.get("size")).toBe("640x320");
    expect(params.get("scale")).toBe("2");
    expect(params.get("colorScheme")).toBe("dark");
    expect(params.get("poi")).toBe("0");
  });

  it("draws the route as a polyline overlay in the accent colour", () => {
    const [overlay] = JSON.parse(params.get("overlays")!);
    expect(overlay.type).toBe("polyline");
    expect(overlay.strokeColor).toBe("D97757");
    expect(decodePolyline(overlay.points)).toEqual(track);
  });

  it("marks start and end with dots", () => {
    const [start, end] = JSON.parse(params.get("annotations")!);
    expect(start).toEqual({
      point: "51.50000,-0.12000",
      markerStyle: "dot",
      color: "7AB948",
    });
    expect(end.point).toBe("51.51000,-0.10000");
    expect(end.color).toBe("D97757");
  });

  it("uses a darker start dot in the light scheme", () => {
    const light = new URLSearchParams(
      snapshotQuery({ track, colorScheme: "light" }),
    );
    expect(JSON.parse(light.get("annotations")!)[0].color).toBe("275B19");
  });

  it("never frames tighter than a few streets, and caps the size at Apple's limit", () => {
    const tiny = new URLSearchParams(
      snapshotQuery({
        track: [
          [51.5, -0.1],
          [51.5001, -0.1001],
        ],
        colorScheme: "light",
        width: 2000,
        height: 10,
      }),
    );
    expect(tiny.get("spn")).toBe("0.00300,0.00300");
    expect(tiny.get("size")).toBe("640x50");
  });

  it("is stable: the same input gives the same string, in the same order", () => {
    const a = snapshotQuery({ track, colorScheme: "light" });
    expect(snapshotQuery({ track, colorScheme: "light" })).toBe(a);
    expect(a.startsWith("center=")).toBe(true);
  });

  it("refuses a track with fewer than two points", () => {
    expect(() =>
      snapshotQuery({ track: [[51.5, -0.1]], colorScheme: "light" }),
    ).toThrow();
  });
});
