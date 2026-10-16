/**
 * A static map: which slippy-map tiles to show, and where the route falls on
 * them, for a frame of a given size. Pure maths; the widget just places images.
 * Tile numbering follows OpenStreetMap (Web Mercator, 256 px tiles).
 */

import type { LatLng } from "./route";

export const TILE_SIZE = 256;

export interface Tile {
  z: number;
  x: number;
  y: number;
  /** Offset of the tile's top-left corner within the frame, in pixels. */
  left: number;
  top: number;
}

export interface StaticMapLayout {
  zoom: number;
  tiles: Tile[];
  /** The route as frame pixel coordinates. */
  path: Array<[number, number]>;
}

export interface StaticMapOptions {
  track: LatLng[];
  width: number;
  height: number;
  /** Pixels kept clear between the route and the frame edge. */
  padding?: number;
  maxZoom?: number;
}

/** World pixel coordinates of a point at a zoom level. */
export function project([lat, lng]: LatLng, zoom: number): [number, number] {
  const scale = TILE_SIZE * 2 ** zoom;
  const sin = Math.sin((lat * Math.PI) / 180);
  const x = ((lng + 180) / 360) * scale;
  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale;
  return [x, y];
}

export function layoutStaticMap({
  track,
  width,
  height,
  padding = 16,
  maxZoom = 17,
}: StaticMapOptions): StaticMapLayout {
  if (track.length === 0) return { zoom: 0, tiles: [], path: [] };

  const innerW = Math.max(1, width - 2 * padding);
  const innerH = Math.max(1, height - 2 * padding);
  const bounds = project0Bounds(track);

  // At zoom z the track spans bounds * 2^z pixels; take the largest z that fits.
  let zoom = maxZoom;
  for (let z = 0; z <= maxZoom; z++) {
    const w = (bounds.maxX - bounds.minX) * 2 ** z;
    const h = (bounds.maxY - bounds.minY) * 2 ** z;
    if (w > innerW || h > innerH) {
      zoom = z - 1;
      break;
    }
  }
  zoom = Math.max(0, zoom);

  const scale = 2 ** zoom;
  const centreX = ((bounds.minX + bounds.maxX) / 2) * scale;
  const centreY = ((bounds.minY + bounds.maxY) / 2) * scale;
  const originX = centreX - width / 2;
  const originY = centreY - height / 2;

  const path = track.map((p): [number, number] => {
    const [x, y] = project(p, zoom);
    return [x - originX, y - originY];
  });

  const tiles: Tile[] = [];
  const maxIndex = 2 ** zoom - 1;
  const firstX = Math.floor(originX / TILE_SIZE);
  const lastX = Math.floor((originX + width) / TILE_SIZE);
  const firstY = Math.floor(originY / TILE_SIZE);
  const lastY = Math.floor((originY + height) / TILE_SIZE);
  for (let x = firstX; x <= lastX; x++) {
    for (let y = firstY; y <= lastY; y++) {
      if (x < 0 || y < 0 || x > maxIndex || y > maxIndex) continue;
      tiles.push({
        z: zoom,
        x,
        y,
        left: x * TILE_SIZE - originX,
        top: y * TILE_SIZE - originY,
      });
    }
  }
  return { zoom, tiles, path };
}

/** Bounding box in zoom-0 world pixels. */
function project0Bounds(track: LatLng[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of track) {
    const [x, y] = project(p, 0);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

export interface TileUrlOptions {
  /** CARTO style name, for instance `light_all` or `dark_all`. */
  style: string;
  /** Request 512px tiles for high-density screens. */
  retina?: boolean;
  /** CARTO basemaps key; required since 25 Sep 2026 or tiles come back watermarked. */
  key: string;
}

/** The address of one CARTO raster tile. */
export function tileUrl(
  { z, x, y }: Pick<Tile, "z" | "x" | "y">,
  opts: TileUrlOptions,
): string {
  const size = opts.retina ? "@2x" : "";
  return `https://basemaps.cartocdn.com/${opts.style}/${z}/${x}/${y}${size}.png?key=${encodeURIComponent(opts.key)}`;
}
