/**
 * What to do with a webhook call from intervals.icu. The body carries the
 * shared secret and a batch of events; each event names the athlete, its
 * type and the activity. We email the user about each newly uploaded
 * activity of theirs and ignore everything else. Pure decision-making over
 * injected dependencies, so the route stays a few lines.
 */

import { z } from "zod";
import { secretMatches } from "@/src/auth";

/** The event types that mean "a new workout has arrived". */
export const NOTIFY_ON_EVENTS = ["ACTIVITY_UPLOADED"] as const;

const idSchema = z.union([z.string(), z.number()]).transform(String);

export const webhookPayloadSchema = z.object({
  secret: z.string().min(1),
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
  /** The secret intervals.icu was configured with; unset means reject everything. */
  secret: string | undefined;
  /** The one athlete we act for during the single-user phase. */
  athleteId: string | undefined;
  /** Sends the email for one activity, or null when notifications are off. */
  notify: ((activityId: string) => Promise<unknown>) | null;
}

export async function handleIntervalsWebhook({
  body,
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
  if (!secretMatches(parsed.data.secret, secret)) {
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
