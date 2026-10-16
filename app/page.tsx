"use client";

import { useMcpApp } from "@/app/hooks/use-mcp-app";

export default function HomePage() {
  const { connected, toolResult } = useMcpApp();
  const greeting =
    typeof toolResult?.greeting === "string" ? toolResult.greeting : null;

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-6 font-sans text-zinc-900 dark:text-zinc-100">
      <h1 className="text-2xl font-semibold tracking-tight">runsense-ultra</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        {greeting ?? "A running coach that lives inside Claude."}
      </p>
      <p className="text-xs text-zinc-500">
        {connected ? "Connected to the MCP host." : "Not inside an MCP host."}
      </p>
    </main>
  );
}
