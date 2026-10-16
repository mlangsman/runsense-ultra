import type { Metadata } from "next";
import "./globals.css";
import { baseURL } from "@/baseUrl";

export const metadata: Metadata = {
  title: "runsense-ultra",
  description: "A running coach that lives inside Claude",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <IframeBootstrap baseUrl={baseURL} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}

/**
 * Inline scripts that make a Next.js page work inside the host's sandboxed
 * iframe. `assetPrefix` in next.config.ts handles script/style URLs.
 */
function IframeBootstrap({ baseUrl }: { baseUrl: string }) {
  return (
    <>
      <base href={baseUrl} />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.__baseUrl=${JSON.stringify(baseUrl)};`,
        }}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `(${iframePatchFn.toString()})()`,
        }}
      />
    </>
  );
}

/**
 * Self-executing function injected as an inline `<script>`. It runs before
 * React hydrates and makes Next.js behave correctly inside an iframe whose
 * origin differs from the real server. Serialised with `.toString()`, so the
 * TypeScript types are for readability only.
 */
function iframePatchFn() {
  const baseUrl: string = window.__baseUrl;
  const htmlElement = document.documentElement;
  const isInIframe = window.self !== window.top;

  // 1. Prevent the host from mutating <html> attributes (hydration errors),
  //    while allowing the theme attributes the MCP Apps bridge sets.
  const allowed = new Set([
    "suppresshydrationwarning",
    "lang",
    "data-theme",
    "style",
    "class",
  ]);
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes" && mutation.target === htmlElement) {
        const attr = mutation.attributeName;
        if (attr && !allowed.has(attr)) htmlElement.removeAttribute(attr);
      }
    }
  });
  observer.observe(htmlElement, { attributes: true, attributeOldValue: true });

  // 2. Patch history: the sandbox may reject cross-origin state changes.
  const origReplace = history.replaceState.bind(history);
  history.replaceState = function (
    _state: unknown,
    unused: string,
    url?: string | URL | null,
  ) {
    try {
      const u = new URL(String(url ?? ""), window.location.href);
      origReplace(null, unused, u.pathname + u.search + u.hash);
    } catch {
      /* SecurityError in sandboxed iframe */
    }
  };
  const origPush = history.pushState.bind(history);
  history.pushState = function (
    _state: unknown,
    unused: string,
    url?: string | URL | null,
  ) {
    try {
      const u = new URL(String(url ?? ""), window.location.href);
      origPush(null, unused, u.pathname + u.search + u.hash);
    } catch {
      /* SecurityError in sandboxed iframe */
    }
  };

  // 3. Patch fetch so RSC / data payloads go to the real server.
  const appOrigin = new URL(baseUrl).origin;
  if (isInIframe && window.location.origin !== appOrigin) {
    const originalFetch = window.fetch.bind(window);
    window.fetch = function patchedFetch(
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> {
      const url =
        typeof input === "string" || input instanceof URL
          ? new URL(String(input), window.location.href)
          : new URL(input.url, window.location.href);
      if (url.origin === appOrigin || url.origin === window.location.origin) {
        const rewritten = new URL(baseUrl);
        rewritten.pathname = url.pathname;
        rewritten.search = url.search;
        rewritten.hash = url.hash;
        const newInput =
          typeof input === "string" || input instanceof URL
            ? rewritten.toString()
            : new Request(rewritten.toString(), input);
        return originalFetch(newInput, { ...init, mode: "cors" });
      }
      return originalFetch(input, init);
    } as typeof fetch;
  }
}
