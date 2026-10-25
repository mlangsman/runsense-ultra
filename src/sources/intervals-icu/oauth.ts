/**
 * The OAuth dance with intervals.icu: send the athlete to its authorize
 * page, then swap the code it hands back for an access token. intervals.icu
 * tokens do not expire and there is no refresh token; a rejected token means
 * sending the athlete through the flow again. The code must be exchanged
 * within two minutes.
 */
import { z } from "zod";

const AUTHORIZE_URL = "https://intervals.icu/oauth/authorize";
const TOKEN_URL = "https://intervals.icu/api/oauth/token";

export type IntervalsScope =
  "ACTIVITY:READ" | "ACTIVITY:WRITE" | "WELLNESS:READ" | "WELLNESS:WRITE";

export class IntervalsOAuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "IntervalsOAuthError";
  }
}

export function authorizeUrl(opts: {
  clientId: string;
  redirectUri: string;
  scope: IntervalsScope[];
  state: string;
}): string {
  const params = new URLSearchParams({
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    scope: opts.scope.join(","),
    state: opts.state,
  });
  return `${AUTHORIZE_URL}?${params}`;
}

const tokenResponse = z.object({
  access_token: z.string().min(1),
  scope: z.string().optional(),
  athlete: z.object({
    id: z.union([z.string(), z.number()]).transform(String),
    name: z.string().nullish(),
  }),
});

export interface ExchangedToken {
  accessToken: string;
  scope: string | null;
  athleteId: string;
  athleteName: string | null;
}

export async function exchangeCode(opts: {
  clientId: string;
  clientSecret: string;
  code: string;
  fetch?: typeof fetch;
}): Promise<ExchangedToken> {
  const doFetch = opts.fetch ?? fetch;
  const body = new URLSearchParams({
    client_id: opts.clientId,
    client_secret: opts.clientSecret,
    code: opts.code,
    grant_type: "authorization_code",
  });
  const res = await doFetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: body.toString(),
  });
  // The body is never surfaced: it could echo the secret or the token.
  if (!res.ok) {
    throw new IntervalsOAuthError(
      `intervals.icu token endpoint responded ${res.status}`,
      res.status,
    );
  }
  const parsed = tokenResponse.safeParse(await res.json().catch(() => null));
  if (!parsed.success) {
    throw new IntervalsOAuthError(
      "intervals.icu token response was not in the expected shape",
      res.status,
    );
  }
  return {
    accessToken: parsed.data.access_token,
    scope: parsed.data.scope ?? null,
    athleteId: parsed.data.athlete.id,
    athleteName: parsed.data.athlete.name ?? null,
  };
}
