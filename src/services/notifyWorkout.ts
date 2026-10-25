import { buildWorkoutEmail } from "@/src/domain/email";
import { openPageUrl, workoutPrompt } from "@/src/domain/openLinks";
import type { EmailSender } from "@/src/sources/resend/client";
import {
  getWorkoutDetail,
  type WorkoutDetail,
  type WorkoutDetailSource,
} from "./workoutDetail";

export interface NotifyWorkoutOptions {
  client: WorkoutDetailSource;
  id: string;
  sender: EmailSender;
  to: string;
  /** A static image of the route for the email, or null for none. Defaults to none. */
  mapImage?: (detail: WorkoutDetail) => string | null;
  /** Our public origin; with it the button goes via our open page, which hands off to the desktop app. */
  baseUrl?: string;
}

/** Email one finished workout: fetch it, build the message, send it. */
export async function notifyWorkout({
  client,
  id,
  sender,
  to,
  mapImage = () => null,
  baseUrl,
}: NotifyWorkoutOptions): Promise<{ subject: string }> {
  const detail = await getWorkoutDetail({ client, id });
  const email = buildWorkoutEmail({
    detail,
    mapImageUrl: mapImage(detail),
    openUrl: baseUrl
      ? openPageUrl(baseUrl, workoutPrompt(detail.workout))
      : undefined,
  });
  await sender.send({ to, ...email });
  return { subject: email.subject };
}
