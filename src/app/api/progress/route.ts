import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { mergeProgress, normalizeProgress } from "@/lib/progress";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ progress: null }, { status: 401 });

  const row = await getDb()!.progress.findUnique({ where: { userId: user.id } });
  return NextResponse.json({ progress: row?.data ?? null });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: { progress?: unknown; replace?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const db = getDb()!;
  const incoming = normalizeProgress(body.progress);
  const existing = await db.progress.findUnique({ where: { userId: user.id } });
  // Normally merge rather than overwrite, since another device may have synced
  // in between. `replace` is the deliberate exception — it backs the reset
  // button, which a merge would otherwise silently undo.
  const data =
    existing && !body.replace
      ? mergeProgress(normalizeProgress(existing.data), incoming)
      : incoming;

  await db.progress.upsert({
    where: { userId: user.id },
    create: { userId: user.id, data },
    update: { data },
  });

  return NextResponse.json({ progress: data });
}
