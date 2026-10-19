/**
 * What to do with a webhook call from intervals.icu. The app settings page
 * sets a "Webhook Authorization Header" that intervals.icu sends on every
 * call; older write-ups show the same secret as a `secret` field in the
 * body, so either is accepted. The body is a batch of events; each names
 * the athlete, its type and the activity. We email the user about each
 * newly uploaded activity of theirs and ignore everything else. Pure
 * decision-making over injected dependencies, so the route stays small.
 */

import { z } from "zod";
import { secretMatches } from "@/src/auth";

/** The event types that mean "a new workout has arrived". */
export const NOTIFY_ON_EVENTS = ["ACTIVITY_UPLOADED"] as const;

const idSchema = z.union([z.string(), z.number()]).transform(String);

export const webhookPayloadSchema = z.object({
  secret: z.string().optional(),
  events: z.array(
    z.object({
      athlete_id: idSchema,
      type: z.string(),
      activity: z.object({ id: idSchema }).optional(),
    }),
  ),
});

export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;

export interface WebhookResult {
  status: 200 | 400 | 401;
  body: {
    notified: string[];
    ignored: number;
    error?: string;
  };
}

export interface HandleWebhookOptions {
  /** The parsed JSON body, whatever it turned out to be. */
  body: unknown;
  /** The request's Authorization header, as intervals.icu sends the secret. */
  authorization: string | null;
  /** The secret intervals.icu was configured with; unset means reject everything. */
  secret: string | undefined;
  /** The one athlete we act for during the single-user phase. */
  athleteId: string | undefined;
  /** Sends the email for one activity, or null when notifications are off. */
  notify: ((activityId: string) => Promise<unknown>) | null;
}

export async function handleIntervalsWebhook({
  body,
  authorization,
  secret,
  athleteId,
  notify,
}: HandleWebhookOptions): Promise<WebhookResult> {
  const parsed = webhookPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: { notified: [], ignored: 0, error: "malformed payload" },
    };
  }
  const presented = authorization ?? parsed.data.secret;
  if (!secretMatches(presented, secret)) {
    return {
      status: 401,
      body: { notified: [], ignored: 0, error: "bad secret" },
    };
  }

  const notified: string[] = [];
  let ignored = 0;
  for (const event of parsed.data.events) {
    const wanted =
      notify !== null &&
      athleteId !== undefined &&
      event.athlete_id === athleteId &&
      (NOTIFY_ON_EVENTS as readonly string[]).includes(event.type) &&
      event.activity !== undefined;
    if (!wanted) {
      ignored++;
      continue;
    }
    await notify(event.activity!.id);
    notified.push(event.activity!.id);
  }
  return { status: 200, body: { notified, ignored } };
}
