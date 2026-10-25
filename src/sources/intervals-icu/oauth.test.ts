import { describe, expect, it, vi } from "vitest";
import { authorizeUrl, exchangeCode, IntervalsOAuthError } from "./oauth";

describe("authorizeUrl", () => {
  it("points at intervals.icu with the app, redirect, scope and state", () => {
    const url = new URL(
      authorizeUrl({
        clientId: "app-1",
        redirectUri: "https://example.test/connect/intervals/callback",
        scope: ["ACTIVITY:READ"],
        state: "abc",
      }),
    );
    expect(url.origin + url.pathname).toBe(
      "https://intervals.icu/oauth/authorize",
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: "app-1",
      redirect_uri: "https://example.test/connect/intervals/callback",
      scope: "ACTIVITY:READ",
      state: "abc",
    });
  });

  it("joins several scopes with commas", () => {
    const url = new URL(
      authorizeUrl({
        clientId: "app-1",
        redirectUri: "https://example.test/cb",
        scope: ["ACTIVITY:READ", "WELLNESS:READ"],
        state: "s",
      }),
    );
    expect(url.searchParams.get("scope")).toBe("ACTIVITY:READ,WELLNESS:READ");
  });
});

describe("exchangeCode", () => {
  const ok = () =>
    new Response(
      JSON.stringify({
        token_type: "Bearer",
        access_token: "tok-secret",
        scope: "ACTIVITY:READ",
        athlete: { id: "i755526", name: "Marc" },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );

  it("posts the code with the app credentials as a form and returns the athlete", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => ok());
    const result = await exchangeCode({
      clientId: "app-1",
      clientSecret: "shh",
      code: "code-1",
      fetch,
    });
    expect(result).toEqual({
      accessToken: "tok-secret",
      scope: "ACTIVITY:READ",
      athleteId: "i755526",
      athleteName: "Marc",
    });
    const [url, init] = fetch.mock.calls[0] as [
      string,
      RequestInit | undefined,
    ];
    expect(url).toBe("https://intervals.icu/api/oauth/token");
    expect(init?.method).toBe("POST");
    expect(String(init?.body)).toBe(
      "client_id=app-1&client_secret=shh&code=code-1&grant_type=authorization_code",
    );
  });

  it("fails with the status, and without the body, when intervals.icu refuses", async () => {
    const fetch = vi.fn(
      async () =>
        new Response('{"error":"invalid_grant","secret_echo":"shh"}', {
          status: 400,
        }),
    );
    const err = await exchangeCode({
      clientId: "a",
      clientSecret: "shh",
      code: "stale",
      fetch,
    }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(IntervalsOAuthError);
    expect((err as IntervalsOAuthError).status).toBe(400);
    expect((err as Error).message).not.toContain("shh");
  });

  it("rejects a response without an athlete id", async () => {
    const fetch = vi.fn(
      async () => new Response('{"access_token":"t"}', { status: 200 }),
    );
    await expect(
      exchangeCode({ clientId: "a", clientSecret: "b", code: "c", fetch }),
    ).rejects.toBeInstanceOf(IntervalsOAuthError);
  });
});
