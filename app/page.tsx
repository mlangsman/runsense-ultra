import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Runsense",
  description: "A running coach that lives inside Claude",
};

/**
 * The landing page skeleton (Phase 0). Says what Runsense is and points to
 * the privacy policy. The "add to Claude" steps and sign-in arrive with
 * accounts in Phase 1. Plain page, host tokens for colour and type, like
 * the privacy page.
 */
export default function LandingPage() {
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
      <h1 style={{ fontSize: 32, fontWeight: 600, margin: "0 0 8px" }}>
        Runsense
      </h1>
      <p
        style={{
          fontSize: 20,
          color: "var(--rs-text-secondary)",
          margin: "0 0 32px",
        }}
      >
        A running coach that lives inside Claude.
      </p>

      <p style={{ margin: "0 0 16px" }}>
        Connect the watch you already wear, through intervals.icu, and Claude
        shows your runs with maps, splits and laps, keeps your training log,
        tracks how each run felt, and coaches you towards the goal you set.
      </p>

      <p style={{ margin: "0 0 32px" }}>
        Runsense is in private use while it is built. Installing it for anyone
        with an intervals.icu account comes next.
      </p>

      <p style={{ color: "var(--rs-text-secondary)", margin: 0 }}>
        <a href="/privacy" style={{ color: "inherit" }}>
          Privacy policy
        </a>
      </p>
    </main>
  );
}
