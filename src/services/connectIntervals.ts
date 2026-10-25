/**
 * Connecting an intervals.icu account to Runsense. Two steps, one per
 * route: start (build the authorize link and remember the state) and
 * finish (check the state, swap the code for a token).
 *
 * Single-user phase: the token is not kept. The server already reads the
 * owner's account with its API key; what the authorisation buys is that
 * intervals.icu starts sending this athlete's webhooks. Accounts in Phase 1
 * store the token per user, encrypted.
 */
import { readCallback } from "@/src/domain/oauthCallback";
import {
  authorizeUrl,
  exchangeCode,
  type IntervalsScope,
} from "@/src/sources/intervals-icu/oauth";

export const STATE_COOKIE = "intervals_oauth_state";
export const SCOPES: IntervalsScope[] = ["ACTIVITY:READ"];

export interface IntervalsApp {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export function intervalsAppFromEnv(baseUrl: string): IntervalsApp {
  const clientId = process.env.INTERVALS_ICU_CLIENT_ID;
  const clientSecret = process.env.INTERVALS_ICU_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "INTERVALS_ICU_CLIENT_ID and INTERVALS_ICU_CLIENT_SECRET must be set",
    );
  }
  return {
    clientId,
    clientSecret,
    redirectUri: `${baseUrl}/connect/intervals/callback`,
  };
}

export function startConnect(app: IntervalsApp, state: string): string {
  return authorizeUrl({
    clientId: app.clientId,
    redirectUri: app.redirectUri,
    scope: SCOPES,
    state,
  });
}

export type ConnectResult =
  | { kind: "connected"; athleteId: string; athleteName: string | null }
  | { kind: "denied" }
  | { kind: "bad_state" };

export async function finishConnect(
  app: IntervalsApp,
  query: URLSearchParams,
  stateCookie: string | undefined,
  doFetch?: typeof fetch,
): Promise<ConnectResult> {
  const outcome = readCallback(query, stateCookie);
  if (outcome.kind !== "code") return outcome;
  const token = await exchangeCode({
    clientId: app.clientId,
    clientSecret: app.clientSecret,
    code: outcome.code,
    fetch: doFetch,
  });
  return {
    kind: "connected",
    athleteId: token.athleteId,
    athleteName: token.athleteName,
  };
}
