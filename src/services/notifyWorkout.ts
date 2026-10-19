import { buildWorkoutEmail } from "@/src/domain/email";
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
}

/** Email one finished workout: fetch it, build the message, send it. */
export async function notifyWorkout({
  client,
  id,
  sender,
  to,
  mapImage = () => null,
}: NotifyWorkoutOptions): Promise<{ subject: string }> {
  const detail = await getWorkoutDetail({ client, id });
  const email = buildWorkoutEmail({ detail, mapImageUrl: mapImage(detail) });
  await sender.send({ to, ...email });
  return { subject: email.subject };
}
