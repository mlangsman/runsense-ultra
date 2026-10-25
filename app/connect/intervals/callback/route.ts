/**
 * Step two: intervals.icu sends the athlete back here with a code. The
 * service checks the state and swaps the code for a token, and the athlete
 * lands on the "done" page with the outcome. Nothing from the exchange is
 * logged or shown beyond the athlete id and name.
 */
import { NextResponse, type NextRequest } from "next/server";
import { baseURL } from "@/baseUrl";
import {
  finishConnect,
  intervalsAppFromEnv,
  STATE_COOKIE,
} from "@/src/services/connectIntervals";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const done = new URL("/connect/intervals/done", baseURL);
  try {
    const result = await finishConnect(
      intervalsAppFromEnv(baseURL),
      request.nextUrl.searchParams,
      request.cookies.get(STATE_COOKIE)?.value,
    );
    done.searchParams.set("result", result.kind);
    if (result.kind === "connected") {
      done.searchParams.set("athlete", result.athleteId);
      if (result.athleteName) done.searchParams.set("name", result.athleteName);
    }
  } catch (err) {
    console.error("intervals.icu connect failed", err);
    done.searchParams.set("result", "failed");
  }
  const res = NextResponse.redirect(done);
  res.cookies.delete({ name: STATE_COOKIE, path: "/connect/intervals" });
  return res;
}
