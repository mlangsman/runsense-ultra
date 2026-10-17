"use client";

import { useMemo, useState, type CSSProperties } from "react";
import {
  useApp,
  useHostFonts,
  useHostStyleVariables,
} from "@modelcontextprotocol/ext-apps/react";
import type { App, McpUiHostContext } from "@modelcontextprotocol/ext-apps";

/**
 * The host bridge, built on the SDK's own React hooks as the MCP Apps plugin
 * recommends: `useApp` creates and connects the App (handlers registered
 * before connect), `useHostStyleVariables` and `useHostFonts` apply the
 * host's theme, tokens and Anthropic Sans. This file only adds what the
 * widgets read: the tool result and a small, typed view of the host context.
 */

const NO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };

export interface HostInfo {
  theme: "light" | "dark" | null;
  platform: string | null;
  displayMode: string | null;
  /** What the host can switch to; null when it did not say. */
  availableDisplayModes: string[] | null;
  /** Pixels the host asks us to keep clear on each edge. */
  safeArea: { top: number; right: number; bottom: number; left: number };
  /** True when the host lets the widget post a message into the chat. */
  canMessage: boolean;
}

const INITIAL_HOST: HostInfo = {
  theme: null,
  platform: null,
  displayMode: null,
  availableDisplayModes: null,
  safeArea: NO_INSETS,
  canMessage: false,
};

/** Merge a host context notification (always partial) into what we know. */
function mergeHost(
  prev: HostInfo,
  ctx: McpUiHostContext | undefined,
): HostInfo {
  if (!ctx) return prev;
  const insets = ctx.safeAreaInsets as Partial<typeof NO_INSETS> | undefined;
  return {
    ...prev,
    theme: ctx.theme ?? prev.theme,
    platform: typeof ctx.platform === "string" ? ctx.platform : prev.platform,
    displayMode:
      typeof ctx.displayMode === "string" ? ctx.displayMode : prev.displayMode,
    availableDisplayModes: Array.isArray(ctx.availableDisplayModes)
      ? (ctx.availableDisplayModes as string[])
      : prev.availableDisplayModes,
    safeArea: insets ? { ...NO_INSETS, ...insets } : prev.safeArea,
  };
}

type ToolData = Record<string, unknown> | null;

/**
 * A tool result left in sessionStorage by `scripts/` renders, so a widget can
 * be checked headless with fixture data. Never set inside Claude.
 */
const RENDER_FIXTURE_KEY = "__mcp_tool_result";
function renderFixture(): ToolData {
  try {
    const raw = sessionStorage.getItem(RENDER_FIXTURE_KEY);
    return raw ? (JSON.parse(raw) as ToolData) : null;
  } catch {
    return null;
  }
}

export function useMcpApp() {
  const [toolInput, setToolInput] = useState<ToolData>(null);
  const [toolResult, setToolResult] = useState<ToolData>(null);
  // The SDK merges every host context change into app.getHostContext(); we only need to re-render when one lands.
  const [contextVersion, setContextVersion] = useState(0);
  const [fixture] = useState<ToolData>(() =>
    typeof window === "undefined" ? null : renderFixture(),
  );

  const { app, isConnected, error } = useApp({
    appInfo: { name: "runsense-widget", version: "0.1.0" },
    capabilities: {},
    onAppCreated: (app: App) => {
      // All handlers go on before connect, per the SDK's lifecycle rules.
      app.ontoolinput = (params) => setToolInput(params.arguments ?? null);
      app.ontoolresult = (result) =>
        setToolResult((result.structuredContent as ToolData) ?? null);
      app.addEventListener("hostcontextchanged", () =>
        setContextVersion((n) => n + 1),
      );
      // Nothing to flush: every bit of state came from the tool result.
      app.onteardown = async () => ({});
      app.onerror = (err) => console.error("[mcp-app] error:", err);
    },
  });

  useHostStyleVariables(app, app?.getHostContext());
  useHostFonts(app, app?.getHostContext());

  const host = useMemo<HostInfo>(
    () => ({
      ...mergeHost(INITIAL_HOST, app?.getHostContext()),
      canMessage: app?.getHostCapabilities()?.message != null,
    }),
    // contextVersion is the signal that getHostContext() has new content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [app, contextVersion],
  );

  if (error) console.warn("[mcp-app] not connected to a host:", error.message);

  return {
    app,
    connected: isConnected,
    toolInput,
    // Outside a host (a headless render) fall back to the fixture a script left behind.
    toolResult: toolResult ?? (error ? fixture : null),
    host,
  };
}

/**
 * Padding for a widget's root: a 16px inset on every side (the kit's card
 * inset, so content clears the host's rounded frame) that grows to the
 * host's safe-area inset where that is larger. Insets never stack on it.
 */
export function framePadding(host: HostInfo): CSSProperties {
  const side = (inset: number) => `max(var(--rs-space-4, 16px), ${inset}px)`;
  return {
    paddingTop: side(host.safeArea.top),
    paddingRight: side(host.safeArea.right),
    paddingBottom: side(host.safeArea.bottom),
    paddingLeft: side(host.safeArea.left),
  };
}
