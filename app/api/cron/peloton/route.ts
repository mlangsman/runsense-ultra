/**
 * Scheduled by Vercel (see vercel.json). Vercel sends the CRON_SECRET as a
 * bearer token; anyone else is refused. Thin: the work is in the service.
 */
import { NextResponse } from "next/server";
import { isAuthorised } from "@/src/auth";
import { syncPeloton } from "@/src/services/syncPeloton";
import { intervalsIcuClientFromEnv } from "@/src/sources/intervals-icu/client";
import { pelotonClientFromEnv } from "@/src/sources/peloton/client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const header = request.headers.get("authorization");
  if (!isAuthorised(header, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const report = await syncPeloton({
      peloton: pelotonClientFromEnv(),
      intervals: intervalsIcuClientFromEnv(),
    });
    return NextResponse.json(report);
  } catch (err) {
    // The message only. Errors from the clients name a status and a path,
    // never a credential.
    const message = err instanceof Error ? err.message : "Sync failed";
    console.error(`peloton sync failed: ${message}`);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
