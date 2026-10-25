import { describe, expect, it, vi } from "vitest";
import { finishConnect, startConnect } from "./connectIntervals";

const app = {
  clientId: "app-1",
  clientSecret: "shh",
  redirectUri: "https://example.test/connect/intervals/callback",
};

describe("startConnect", () => {
  it("sends the athlete to intervals.icu asking to read activities", () => {
    const url = new URL(startConnect(app, "s1"));
    expect(url.host).toBe("intervals.icu");
    expect(url.searchParams.get("scope")).toBe("ACTIVITY:READ");
    expect(url.searchParams.get("state")).toBe("s1");
    expect(url.searchParams.get("redirect_uri")).toBe(app.redirectUri);
  });
});

describe("finishConnect", () => {
  it("exchanges the code and reports the athlete", async () => {
    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            access_token: "t",
            athlete: { id: "i1", name: "Ann" },
          }),
          { status: 200 },
        ),
    );
    const result = await finishConnect(
      app,
      new URLSearchParams("code=c&state=s1"),
      "s1",
      fetch,
    );
    expect(result).toEqual({
      kind: "connected",
      athleteId: "i1",
      athleteName: "Ann",
    });
  });

  it("never calls intervals.icu when the state is wrong or access was denied", async () => {
    const fetch = vi.fn();
    expect(
      await finishConnect(
        app,
        new URLSearchParams("code=c&state=x"),
        "s1",
        fetch,
      ),
    ).toEqual({ kind: "bad_state" });
    expect(
      await finishConnect(
        app,
        new URLSearchParams("error=access_denied&state=s1"),
        "s1",
        fetch,
      ),
    ).toEqual({ kind: "denied" });
    expect(fetch).not.toHaveBeenCalled();
  });
});
