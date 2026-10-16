import { timingSafeEqual } from "node:crypto";

/**
 * Single-user auth for the MCP endpoint: a shared bearer token that Claude
 * sends as a request header. Replaced by per-user OAuth in Phase 1.
 */
export function isAuthorised(
  authorizationHeader: string | null,
  expectedToken: string | undefined,
): boolean {
  if (!expectedToken) return false;
  if (!authorizationHeader?.startsWith("Bearer ")) return false;
  const presented = authorizationHeader.slice("Bearer ".length);
  if (presented.length === 0 || presented.length !== expectedToken.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(presented), Buffer.from(expectedToken));
}
