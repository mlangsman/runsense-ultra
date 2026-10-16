"use client";

import { useSyncExternalStore } from "react";
import type { App, McpUiHostContext } from "@modelcontextprotocol/ext-apps";

// ---------------------------------------------------------------------------
// Session-persistent singleton App instance.
//
// The MCP host establishes a single bridge per iframe. We create the App once
// and share it across all pages. Tool data is persisted to sessionStorage so
// it survives client-side navigations, module re-evaluations (HMR), and
// forward/back browser history.
// ---------------------------------------------------------------------------

const STORAGE = {
  INPUT: "__mcp_tool_input",
  RESULT: "__mcp_tool_result",
  CONNECTED: "__mcp_connected",
} as const;

function read<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    if (value == null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sessionStorage may be unavailable in some sandboxes */
  }
}

// ---------------------------------------------------------------------------
// In-memory cache (fast path, avoids JSON.parse on every render)
// ---------------------------------------------------------------------------

let memConnected = read<boolean>(STORAGE.CONNECTED) ?? false;
let memToolInput = read<Record<string, unknown>>(STORAGE.INPUT);
let memToolResult = read<Record<string, unknown>>(STORAGE.RESULT);
let memHost: HostInfo = { theme: null, hostStyles: false, debug: "" };

export interface HostInfo {
  theme: "light" | "dark" | null;
  /** True when the host supplied its own CSS variables for theming. */
  hostStyles: boolean;
  /** Temporary: what the host sent, so we can match its look by evidence. */
  debug: string;
}

const listeners = new Set<() => void>();
function notify() {
  for (const l of listeners) l();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ---------------------------------------------------------------------------
// Theme: take the host's theme and style variables when it offers them, so
// the widget blends into the conversation instead of sitting beside it.
// ---------------------------------------------------------------------------

async function applyHostContext(ctx: McpUiHostContext | undefined) {
  if (!ctx) return;
  const { applyDocumentTheme, applyHostStyleVariables, applyHostFonts } =
    await import("@modelcontextprotocol/ext-apps");
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  const variables = ctx.styles?.variables;
  if (variables && Object.keys(variables).length > 0) {
    applyHostStyleVariables(variables);
  }
  const fonts = ctx.styles?.css?.fonts;
  if (fonts) applyHostFonts(fonts);
  const rest = Object.fromEntries(
    Object.entries(ctx).filter(([k]) => k !== "styles"),
  );
  memHost = {
    theme: ctx.theme ?? null,
    hostStyles: !!variables && Object.keys(variables).length > 0,
    debug: JSON.stringify(
      {
        context: rest,
        fontsCss: fonts ? `${fonts.length} chars` : null,
        variables: variables ?? null,
      },
      null,
      1,
    ),
  };
  notify();
}

// ---------------------------------------------------------------------------
// Singleton connection
// ---------------------------------------------------------------------------

let singletonApp: App | null = null;

async function ensureConnected() {
  if (singletonApp) return;

  const { App } = await import("@modelcontextprotocol/ext-apps");

  const app = new App(
    { name: "runsense-widget", version: "0.1.0" },
    {},
    { autoResize: true },
  );

  app.ontoolinput = (params) => {
    memToolInput = params.arguments ?? null;
    write(STORAGE.INPUT, memToolInput);
    notify();
  };

  app.ontoolresult = (result) => {
    memToolResult =
      (result.structuredContent as Record<string, unknown>) ?? null;
    write(STORAGE.RESULT, memToolResult);
    notify();
  };

  app.onhostcontextchanged = (ctx) => {
    void applyHostContext(ctx);
  };

  app.onerror = (error) => {
    console.error("[mcp-app] error:", error);
  };

  try {
    await app.connect();
    singletonApp = app;
    memConnected = true;
    write(STORAGE.CONNECTED, true);
    notify();
    void applyHostContext(app.getHostContext());
  } catch (err) {
    console.warn("[mcp-app] connect failed (not in MCP host?):", err);
  }
}

// Kick off connection once (module-level, guarded)
if (typeof window !== "undefined" && window.self !== window.top) {
  ensureConnected();
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * React hook that provides the MCP Apps bridge state.
 *
 * The underlying `App` instance is a singleton — created once when the module
 * loads inside an iframe. Tool data is persisted to `sessionStorage` so it
 * survives navigations and module re-evaluations.
 */
export function useMcpApp() {
  const connected = useSyncExternalStore(
    subscribe,
    () => memConnected,
    () => false,
  );
  const toolInput = useSyncExternalStore(
    subscribe,
    () => memToolInput,
    () => null,
  );
  const toolResult = useSyncExternalStore(
    subscribe,
    () => memToolResult,
    () => null,
  );
  const host = useSyncExternalStore(
    subscribe,
    () => memHost,
    () => memHost,
  );

  return { app: singletonApp, connected, toolInput, toolResult, host };
}
