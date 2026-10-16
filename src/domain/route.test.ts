import { describe, expect, it } from "vitest";
import { decodePolyline, encodePolyline, simplify, type LatLng } from "./route";

const square: LatLng[] = [
  [51.5, -0.1],
  [51.5, -0.09],
  [51.51, -0.09],
  [51.51, -0.1],
];

describe("encodePolyline / decodePolyline", () => {
  it("round-trips to five decimal places", () => {
    const decoded = decodePolyline(encodePolyline(square));
    expect(decoded).toHaveLength(4);
    decoded.forEach(([lat, lng], i) => {
      expect(lat).toBeCloseTo(square[i][0], 5);
      expect(lng).toBeCloseTo(square[i][1], 5);
    });
  });

  it("matches Google's documented example", () => {
    // https://developers.google.com/maps/documentation/utilities/polylinealgorithm
    const points: LatLng[] = [
      [38.5, -120.2],
      [40.7, -120.95],
      [43.252, -126.453],
    ];
    expect(encodePolyline(points)).toBe("_p~iF~ps|U_ulLnnqC_mqNvxq`@");
  });

  it("encodes nothing as an empty string", () => {
    expect(encodePolyline([])).toBe("");
    expect(decodePolyline("")).toEqual([]);
  });
});

describe("simplify", () => {
  it("drops points that sit on a straight line", () => {
    const line: LatLng[] = [
      [0, 0],
      [0.001, 0.001],
      [0.002, 0.002],
      [0.003, 0.003],
    ];
    expect(simplify(line, 0.00001)).toEqual([
      [0, 0],
      [0.003, 0.003],
    ]);
  });

  it("keeps corners", () => {
    expect(simplify(square, 0.00001)).toEqual(square);
  });

  it("keeps the first and last point of a two-point track", () => {
    expect(simplify(square.slice(0, 2), 1)).toEqual(square.slice(0, 2));
  });

  it("can cap the number of points by raising the tolerance", () => {
    const wobble: LatLng[] = Array.from({ length: 2000 }, (_, i) => [
      51.5 + i * 0.00001 + (i % 2) * 0.000004,
      -0.1 + i * 0.00002,
    ]);
    const out = simplify(wobble, 0.00001);
    expect(out.length).toBeLessThan(200);
    expect(out[0]).toEqual(wobble[0]);
    expect(out[out.length - 1]).toEqual(wobble[wobble.length - 1]);
  });
});
