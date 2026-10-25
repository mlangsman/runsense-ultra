import { describe, expect, it } from "vitest";
import { readCallback } from "./oauthCallback";

const q = (s: string) => new URLSearchParams(s);

describe("readCallback", () => {
  it("returns the code when the state matches the cookie", () => {
    expect(readCallback(q("code=abc&state=s1"), "s1")).toEqual({
      kind: "code",
      code: "abc",
    });
  });

  it("reports a denial from the athlete", () => {
    expect(readCallback(q("error=access_denied&state=s1"), "s1")).toEqual({
      kind: "denied",
    });
  });

  it("rejects a missing, different or absent-cookie state", () => {
    expect(readCallback(q("code=abc"), "s1")).toEqual({ kind: "bad_state" });
    expect(readCallback(q("code=abc&state=other"), "s1")).toEqual({
      kind: "bad_state",
    });
    expect(readCallback(q("code=abc&state=s1"), undefined)).toEqual({
      kind: "bad_state",
    });
  });

  it("treats a matching state with no code as malformed", () => {
    expect(readCallback(q("state=s1"), "s1")).toEqual({ kind: "bad_state" });
  });
});
