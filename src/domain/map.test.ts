import { describe, expect, it } from "vitest";
import { layoutStaticMap, project, tileUrl } from "./map";
import type { LatLng } from "./route";

describe("project", () => {
  it("puts the null island at the centre of the world at zoom 0", () => {
    expect(project([0, 0], 0)).toEqual([128, 128]);
  });

  it("matches the OpenStreetMap tile numbering at zoom 12", () => {
    // Tile 12/2046/1362 covers central London (~51.5N, 0.1W).
    const [x, y] = project([51.5, -0.1], 12);
    expect(Math.floor(x / 256)).toBe(2046);
    expect(Math.floor(y / 256)).toBe(1362);
  });
});

describe("layoutStaticMap", () => {
  const track: LatLng[] = [
    [51.5, -0.12],
    [51.505, -0.11],
    [51.51, -0.1],
  ];

  it("picks the largest zoom at which the track fits inside the padding", () => {
    const map = layoutStaticMap({
      track,
      width: 320,
      height: 200,
      padding: 16,
    });
    const xs = map.path.map(([x]) => x);
    const ys = map.path.map(([, y]) => y);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(16);
    expect(Math.max(...xs)).toBeLessThanOrEqual(304);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(16);
    expect(Math.max(...ys)).toBeLessThanOrEqual(184);
    const bigger = layoutStaticMap({
      track,
      width: 320,
      height: 200,
      padding: 16,
      maxZoom: map.zoom + 1,
    });
    // One zoom level up would overflow the padding on at least one axis.
    const spanX = Math.max(...xs) - Math.min(...xs);
    const spanY = Math.max(...ys) - Math.min(...ys);
    expect(spanX * 2 > 320 - 32 || spanY * 2 > 200 - 32).toBe(true);
    expect(bigger.zoom).toBe(map.zoom);
  });

  it("centres the track", () => {
    const map = layoutStaticMap({
      track,
      width: 320,
      height: 200,
      padding: 16,
    });
    const xs = map.path.map(([x]) => x);
    const ys = map.path.map(([, y]) => y);
    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(160, 0);
    expect((Math.min(...ys) + Math.max(...ys)) / 2).toBeCloseTo(100, 0);
  });

  it("lists every tile that touches the frame, positioned in pixels", () => {
    const map = layoutStaticMap({
      track,
      width: 320,
      height: 200,
      padding: 16,
    });
    expect(map.tiles.length).toBeGreaterThan(0);
    for (const t of map.tiles) {
      expect(t.left).toBeGreaterThan(-256);
      expect(t.left).toBeLessThan(320);
      expect(t.top).toBeGreaterThan(-256);
      expect(t.top).toBeLessThan(200);
      expect(t.z).toBe(map.zoom);
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.y).toBeGreaterThanOrEqual(0);
    }
  });

  it("caps the zoom for a very short track", () => {
    const map = layoutStaticMap({
      track: [
        [51.5, -0.1],
        [51.50001, -0.1],
      ],
      width: 320,
      height: 200,
      padding: 16,
    });
    expect(map.zoom).toBe(17);
  });

  it("returns an empty layout for an empty track", () => {
    const map = layoutStaticMap({ track: [], width: 320, height: 200 });
    expect(map.tiles).toEqual([]);
    expect(map.path).toEqual([]);
  });
});

describe("tileUrl", () => {
  it("addresses a CARTO raster tile with the style and key", () => {
    expect(
      tileUrl({ z: 13, x: 4092, y: 2721 }, { style: "light_all", key: "abc" }),
    ).toBe("https://basemaps.cartocdn.com/light_all/13/4092/2721.png?key=abc");
  });

  it("asks for 2x tiles on dense screens and escapes the key", () => {
    expect(
      tileUrl(
        { z: 1, x: 0, y: 1 },
        { style: "dark_all", retina: true, key: "a b&c" },
      ),
    ).toBe("https://basemaps.cartocdn.com/dark_all/1/0/1@2x.png?key=a%20b%26c");
  });
});
