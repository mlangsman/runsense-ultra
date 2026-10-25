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
        Runsense is a personal running-coach project, used only by its author.
        This policy describes what data is read, what it keeps and how to stop
        it.
      </p>

      <Section title="What it reads">
        With permission, Runsense reads activities from intervals.icu: distance,
        time, pace, heart rate, cadence, elevation, training load, laps, splits
        and the GPS route. It reads nothing else from the account.
      </Section>

      <Section title="What it keeps">
        Nothing is stored at this stage. Each request fetches the workout from
        intervals.icu, shows it in your assistant or sends it by email, and
        discards it.
      </Section>

      <Section title="Where it goes">
        Workout data is shown to you inside the assistant you connect Runsense
        to, such as Claude or ChatGPT, which runs under its own privacy policy.
        When a workout syncs, Runsense can email you a summary through Resend.
        Map images, when shown, are drawn from a map provider using the
        route&apos;s coordinates. No data is sold or shared with anyone else.
      </Section>

      <Section title="How to stop it">
        Disconnect Runsense from the Apps section of intervals.icu or remove the
        Runsense connector from your assistant. Either ends all access. Emails
        stop when the notification address is removed from the server&apos;s
        settings.
      </Section>

      <Section title="Contact">Questions go to runsense@langsman.com.</Section>
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
