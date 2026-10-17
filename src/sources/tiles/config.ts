/**
 * Where the widget's map tiles come from, read from public build-time
 * settings. Any OpenStreetMap-style raster provider works through a URL
 * template, so trying another look is a settings change, not a code change.
 * Without a template, CARTO's basemaps with their free key are used; without
 * that either, there are no tiles and the route draws on a plain card.
 *
 * The names are referenced literally so Next.js inlines them into the client
 * bundle as well as reading them on the server.
 */

import { cartoTileTemplate } from "@/src/domain/map";

export interface TileSource {
  /** Template for the light theme, with `{z}`, `{x}`, `{y}` and optionally `{r}`. */
  light: string;
  /** Template for the dark theme. Defaults to the light one, since outdoor styles rarely come in dark. */
  dark: string;
  /** Credit the provider requires, shown on the map. */
  attribution: string;
}

export function tileSourceFromEnv(): TileSource | null {
  const light = process.env.NEXT_PUBLIC_MAP_TILE_URL;
  const dark = process.env.NEXT_PUBLIC_MAP_TILE_URL_DARK;
  const attribution = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION;
  if (light) {
    return {
      light,
      dark: dark || light,
      attribution: attribution || "© OpenStreetMap contributors",
    };
  }
  const cartoKey = process.env.NEXT_PUBLIC_CARTO_API_KEY;
  if (cartoKey) {
    // Voyager is CARTO's coloured style, close to the maps in Anthropic's kit; it has no dark variant, so dark mode keeps Dark Matter under a coloured route.
    return {
      light: cartoTileTemplate("rastertiles/voyager", cartoKey),
      dark: cartoTileTemplate("dark_all", cartoKey),
      attribution: "© OpenStreetMap © CARTO",
    };
  }
  return null;
}

/** The origins tiles load from, for the widget's content security policy. */
export function tileOrigins(source: TileSource | null): string[] {
  if (!source) return [];
  return [
    ...new Set([source.light, source.dark].map((t) => new URL(t).origin)),
  ];
}
