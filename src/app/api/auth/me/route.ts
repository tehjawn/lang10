import { NextResponse } from "next/server";
import { authEnabled, currentUser } from "@/lib/auth";

export async function GET() {
  return NextResponse.json({ user: await currentUser(), accountsEnabled: authEnabled });
}
