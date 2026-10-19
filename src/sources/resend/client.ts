/**
 * Sending email through Resend's REST API. One call, so a fetch is enough
 * and the shape stays testable with an injected fetch, like the
 * intervals.icu client.
 * Reference: resend.com/docs/api-reference/emails/send-email
 */

import type { Email } from "@/src/domain/email";

const SEND_URL = "https://api.resend.com/emails";

export interface EmailMessage extends Email {
  to: string;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

export class ResendError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ResendError";
  }
}

export interface ResendOptions {
  apiKey: string;
  /** The verified sender, e.g. "Runsense <coach@example.com>". */
  from: string;
  /** Injected for tests; defaults to the global fetch. */
  fetch?: typeof fetch;
}

export function createResendSender({
  apiKey,
  from,
  fetch: doFetch = fetch,
}: ResendOptions): EmailSender {
  return {
    async send({ to, subject, text, html }) {
      const res = await doFetch(SEND_URL, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ from, to: [to], subject, text, html }),
      });
      if (!res.ok) {
        throw new ResendError(`Resend responded ${res.status}`, res.status);
      }
    },
  };
}

/** Build a sender from the server's environment. Throws if unconfigured. */
export function resendSenderFromEnv(): EmailSender {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error("RESEND_API_KEY and EMAIL_FROM must be set");
  }
  return createResendSender({ apiKey, from });
}
