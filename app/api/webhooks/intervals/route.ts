/**
 * intervals.icu calls this when something happens on the connected account.
 * The body carries the shared secret, so the route is open to the network
 * and the service checks the secret. The decision logic lives in
 * src/services/intervalsWebhook.ts; this file only wires the environment.
 */

import { handleIntervalsWebhook } from "@/src/services/intervalsWebhook";
import { notifyWorkout } from "@/src/services/notifyWorkout";
import { intervalsIcuClientFromEnv } from "@/src/sources/intervals-icu/client";
import { resendSenderFromEnv } from "@/src/sources/resend/client";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  // Opt-in for the single-user phase: no address, no emails.
  const to = process.env.NOTIFY_EMAIL_TO;
  try {
    const result = await handleIntervalsWebhook({
      body,
      secret: process.env.INTERVALS_WEBHOOK_SECRET,
      athleteId: process.env.INTERVALS_ICU_ATHLETE_ID,
      notify: to
        ? (id) =>
            notifyWorkout({
              client: intervalsIcuClientFromEnv(),
              id,
              sender: resendSenderFromEnv(),
              to,
            })
        : null,
    });
    return Response.json(result.body, { status: result.status });
  } catch (err) {
    // A non-2xx makes intervals.icu retry, which is what we want for a
    // failed fetch or send. Nothing from the error itself goes back out.
    console.error("intervals.icu webhook failed", err);
    return Response.json({ error: "notification failed" }, { status: 500 });
  }
}
