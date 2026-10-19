import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Runsense privacy policy",
  description: "What Runsense reads, keeps and sends, and how to stop it",
};

/**
 * The privacy policy intervals.icu asks for when an app is registered.
 * Written for the single-user phase; revised in Phase 1 (accounts) and
 * Phase 5 (open to everyone). Plain page, host tokens for colour and type.
 */
export default function PrivacyPage() {
  return (
    <main
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "32px 16px",
        fontFamily: "var(--rs-font)",
        color: "var(--rs-text)",
        fontSize: "var(--rs-body-size)",
        lineHeight: "var(--rs-body-lh)",
      }}
    >
      <h1 style={{ fontSize: 24, fontWeight: 600, margin: "0 0 8px" }}>
        Runsense privacy policy
      </h1>
      <p style={{ color: "var(--rs-text-secondary)", margin: "0 0 24px" }}>
        Last updated 19 October 2026
      </p>

      <p>
        Runsense is a running coach that runs inside Claude. It is a personal
        project by Marc Langsman and is used by its author only at this stage.
        This page says what it reads, what it keeps and how to stop it.
      </p>

      <Section title="What it reads">
        With your permission, Runsense reads your activities from intervals.icu:
        distance, time, pace, heart rate, cadence, elevation, training load,
        laps, splits and the GPS route. It reads nothing else from your account.
      </Section>

      <Section title="What it keeps">
        Nothing yet. Each request fetches the workout from intervals.icu, shows
        it in Claude or sends it by email, and discards it. Secrets for
        intervals.icu and the email service live only in the hosting
        provider&apos;s settings, never in the code.
      </Section>

      <Section title="Where it goes">
        Workout data is shown to you inside Claude, which is run by Anthropic
        under its own privacy policy. When a workout syncs, Runsense can email
        you a summary through Resend, the email service. Map images, when shown,
        are drawn from a map provider using the route&apos;s coordinates. No
        data is sold or shared with anyone else.
      </Section>

      <Section title="How to stop it">
        Disconnect Runsense from the Apps section of your intervals.icu
        settings, or remove the Runsense connector in Claude. Either ends all
        access. Emails stop when the notification address is removed from the
        server&apos;s settings.
      </Section>

      <Section title="Contact">Questions go to marc@langsman.com.</Section>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ margin: "24px 0 0" }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>
        {title}
      </h2>
      <p style={{ margin: 0 }}>{children}</p>
    </section>
  );
}
