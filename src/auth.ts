/**
 * Single-user auth for the MCP endpoint: a shared bearer token that Claude
 * sends as a request header. Replaced by per-user OAuth in Phase 1.
 *
 * Runs in Next's edge middleware, so no Node modules: the comparison is a
 * constant-time loop rather than crypto.timingSafeEqual.
 */
export function isAuthorised(
  authorizationHeader: string | null,
  expectedToken: string | undefined,
): boolean {
  if (!expectedToken) return false;
  if (!authorizationHeader?.startsWith("Bearer ")) return false;
  const presented = authorizationHeader.slice("Bearer ".length);
  if (presented.length === 0) return false;
  return constantTimeEqual(presented, expectedToken);
}

function constantTimeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}
