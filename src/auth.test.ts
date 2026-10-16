import { describe, expect, it } from "vitest";
import { isAuthorised } from "./auth";

describe("isAuthorised", () => {
  it("accepts the configured bearer token", () => {
    expect(isAuthorised("Bearer abc123", "abc123")).toBe(true);
  });

  it("rejects a wrong or missing token", () => {
    expect(isAuthorised("Bearer nope", "abc123")).toBe(false);
    expect(isAuthorised(null, "abc123")).toBe(false);
    expect(isAuthorised("abc123", "abc123")).toBe(false);
  });

  it("fails closed when no token is configured", () => {
    expect(isAuthorised("Bearer abc123", undefined)).toBe(false);
    expect(isAuthorised("Bearer ", "")).toBe(false);
  });
});
