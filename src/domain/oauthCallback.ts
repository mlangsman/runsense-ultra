/**
 * What an OAuth provider's redirect back to us means, once the `state` we
 * set in a cookie is compared with the one it returned. Pure: the route
 * reads the cookie and the query, this decides.
 */

export type CallbackOutcome =
  { kind: "code"; code: string } | { kind: "denied" } | { kind: "bad_state" };

export function readCallback(
  query: URLSearchParams,
  expectedState: string | undefined,
): CallbackOutcome {
  const state = query.get("state");
  if (!expectedState || !state || state !== expectedState) {
    return { kind: "bad_state" };
  }
  if (query.get("error")) return { kind: "denied" };
  const code = query.get("code");
  if (!code) return { kind: "bad_state" };
  return { kind: "code", code };
}
