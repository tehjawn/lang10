import { NextResponse } from "next/server";
import { authEnabled } from "@/lib/auth";
import { dbEnabled } from "@/lib/db";

// Railway's healthcheck hits this. It deliberately does not touch the database:
// local-only mode is a supported state, not an unhealthy one.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    mode: authEnabled ? "accounts" : "local-only",
    database: dbEnabled,
  });
}
