import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";

export const metadata: Metadata = { title: "Runsense: connect intervals.icu" };

const query = z.object({
  result: z
    .enum(["connected", "denied", "bad_state", "failed"])
    .catch("failed"),
  athlete: z.string().max(40).optional(),
  name: z.string().max(80).optional(),
});

/** Where the athlete lands after intervals.icu sends them back. */
export default async function ConnectDonePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = query.parse(await searchParams);
  const { heading, body } = copy(q);
  return (
    <main
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "48px 16px",
        fontFamily: "var(--rs-font)",
        color: "var(--rs-text)",
        fontSize: "var(--rs-body-size)",
        lineHeight: "var(--rs-body-lh)",
      }}
    >
      <h1 style={{ fontSize: 24, fontWeight: 600, margin: "0 0 8px" }}>
        {heading}
      </h1>
      <p style={{ margin: "0 0 24px" }}>{body}</p>
      <p style={{ color: "var(--rs-text-secondary)", margin: 0 }}>
        <Link href="/" style={{ color: "inherit" }}>
          Back to Runsense
        </Link>
      </p>
    </main>
  );
}

function copy(q: z.infer<typeof query>): { heading: string; body: string } {
  switch (q.result) {
    case "connected":
      return {
        heading: "intervals.icu connected",
        body: `Runsense can now see new workouts for ${q.name ?? "your account"} (athlete ${q.athlete}). You can disconnect at any time from the Apps section of your intervals.icu settings.`,
      };
    case "denied":
      return {
        heading: "Not connected",
        body: "You chose not to let Runsense read your activities. Nothing was changed.",
      };
    case "bad_state":
      return {
        heading: "Something didn't match",
        body: "The link back from intervals.icu didn't match the one we started. Start again from Runsense.",
      };
    default:
      return {
        heading: "Connection failed",
        body: "intervals.icu didn't complete the connection. Try again in a minute.",
      };
  }
}
