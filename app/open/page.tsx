import { headers } from "next/headers";
import { z } from "zod";
import {
  claudeAppUrl,
  claudeWebUrl,
  MAX_PROMPT_LENGTH,
  shouldTryApp,
} from "@/src/domain/openLinks";

/**
 * The page behind the email's "Open in Claude" button. Email clients strip
 * claude:// links, so the button comes here over https; on a desktop browser
 * this page hands off to the Claude desktop app and falls back to claude.ai
 * if nothing picks the link up. Phones go straight to claude.ai. The prompt
 * is plain text, so there is nothing to redirect to but Claude.
 */

export const dynamic = "force-dynamic";

const query = z.object({ q: z.string().min(1).max(MAX_PROMPT_LENGTH) });

/** How long to give the desktop app before falling back, in milliseconds. */
const APP_HANDOFF_MS = 1500;

export default async function OpenPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parsed = query.safeParse(await searchParams);
  if (!parsed.success) {
    return (
      <Shell title="Nothing to open">This link is missing its prompt.</Shell>
    );
  }
  const prompt = parsed.data.q;
  const web = claudeWebUrl(prompt);
  const app = claudeAppUrl(prompt);
  const tryApp = shouldTryApp((await headers()).get("user-agent") ?? "");

  const script = tryApp
    ? `(function(){var t=setTimeout(function(){location.replace(${JSON.stringify(web)})},${APP_HANDOFF_MS});` +
      `function stop(){clearTimeout(t)}window.addEventListener("pagehide",stop);` +
      `document.addEventListener("visibilitychange",function(){if(document.hidden)stop()});` +
      `location.href=${JSON.stringify(app)}})();`
    : `location.replace(${JSON.stringify(web)});`;

  return (
    <Shell title="Opening Claude…">
      <script dangerouslySetInnerHTML={{ __html: script }} />
      If nothing happens:{" "}
      {tryApp && (
        <>
          <a href={app}>open the Claude app</a> or{" "}
        </>
      )}
      <a href={web}>open claude.ai in the browser</a>.
    </Shell>
  );
}

function Shell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main
      style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: "48px 16px",
        fontFamily: "var(--rs-font)",
        color: "var(--rs-text)",
        fontSize: "var(--rs-body-size)",
        lineHeight: "var(--rs-body-lh)",
      }}
    >
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 12px" }}>
        {title}
      </h1>
      <p style={{ margin: 0, color: "var(--rs-text-secondary)" }}>{children}</p>
    </main>
  );
}
