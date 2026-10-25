/**
 * Step one of connecting intervals.icu: remember a random state in a
 * short-lived cookie and send the athlete to intervals.icu to approve the
 * app. Wiring only; see src/services/connectIntervals.ts.
 */
import { NextResponse } from "next/server";
import { baseURL } from "@/baseUrl";
import {
  intervalsAppFromEnv,
  startConnect,
  STATE_COOKIE,
} from "@/src/services/connectIntervals";

export const dynamic = "force-dynamic";

export function GET() {
  const state = crypto.randomUUID();
  const res = NextResponse.redirect(
    startConnect(intervalsAppFromEnv(baseURL), state),
  );
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: baseURL.startsWith("https://"),
    sameSite: "lax",
    path: "/connect/intervals",
    maxAge: 10 * 60,
  });
  return res;
}
