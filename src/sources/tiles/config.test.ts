import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { tileOrigins, tileSourceFromEnv } from "./config";

const saved = { ...process.env };
beforeEach(() => {
  delete process.env.NEXT_PUBLIC_MAP_TILE_URL;
  delete process.env.NEXT_PUBLIC_MAP_TILE_URL_DARK;
  delete process.env.NEXT_PUBLIC_MAP_ATTRIBUTION;
  delete process.env.NEXT_PUBLIC_CARTO_API_KEY;
});
afterEach(() => {
  process.env = { ...saved };
});

describe("tileSourceFromEnv", () => {
  it("is null with nothing set, so the widget draws the route on a plain card", () => {
    expect(tileSourceFromEnv()).toBeNull();
    expect(tileOrigins(null)).toEqual([]);
  });

  it("uses a template for both themes, with the OpenStreetMap credit by default", () => {
    process.env.NEXT_PUBLIC_MAP_TILE_URL =
      "https://tile.thunderforest.com/outdoors/{z}/{x}/{y}{r}.png?apikey=k";
    expect(tileSourceFromEnv()).toEqual({
      light:
        "https://tile.thunderforest.com/outdoors/{z}/{x}/{y}{r}.png?apikey=k",
      dark: "https://tile.thunderforest.com/outdoors/{z}/{x}/{y}{r}.png?apikey=k",
      attribution: "© OpenStreetMap contributors",
    });
    expect(tileOrigins(tileSourceFromEnv())).toEqual([
      "https://tile.thunderforest.com",
    ]);
  });

  it("takes a separate dark template and a provider's credit", () => {
    process.env.NEXT_PUBLIC_MAP_TILE_URL = "https://a.example/{z}/{x}/{y}.png";
    process.env.NEXT_PUBLIC_MAP_TILE_URL_DARK =
      "https://b.example/{z}/{x}/{y}.png";
    process.env.NEXT_PUBLIC_MAP_ATTRIBUTION = "Maps © Example";
    const source = tileSourceFromEnv()!;
    expect(source.dark).toBe("https://b.example/{z}/{x}/{y}.png");
    expect(source.attribution).toBe("Maps © Example");
    expect(tileOrigins(source)).toEqual([
      "https://a.example",
      "https://b.example",
    ]);
  });

  it("falls back to CARTO's styles when only its key is set", () => {
    process.env.NEXT_PUBLIC_CARTO_API_KEY = "k";
    const source = tileSourceFromEnv()!;
    expect(source.light).toContain(
      "basemaps.cartocdn.com/rastertiles/voyager/",
    );
    expect(source.dark).toContain("basemaps.cartocdn.com/dark_all/");
    expect(source.attribution).toBe("© OpenStreetMap © CARTO");
    expect(tileOrigins(source)).toEqual(["https://basemaps.cartocdn.com"]);
  });
});
