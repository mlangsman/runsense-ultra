import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAuthorised } from "@/src/auth";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export function middleware(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: CORS });
  }

  if (request.nextUrl.pathname.startsWith("/mcp")) {
    const header = request.headers.get("authorization");
    if (!isAuthorised(header, process.env.APP_TOKEN)) {
      return new NextResponse("Unauthorized", { status: 401, headers: CORS });
    }
  }

  return NextResponse.next({ headers: CORS });
}

export const config = {
  matcher: "/:path*",
};
