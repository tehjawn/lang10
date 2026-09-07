import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import {
  authEnabled,
  normalizeEmail,
  setSessionCookie,
  signSession,
  validateCredentials,
} from "@/lib/auth";
import { getDb } from "@/lib/db";
import { normalizeProgress } from "@/lib/progress";

export async function POST(request: Request) {
  if (!authEnabled) {
    return NextResponse.json({ error: "Accounts are not enabled on this server." }, { status: 503 });
  }
  const db = getDb()!;

  let body: { email?: string; password?: string; name?: string; progress?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = normalizeEmail(body.email ?? "");
  const password = body.password ?? "";
  const invalid = validateCredentials(email, password);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return NextResponse.json({ error: "That email is already registered." }, { status: 409 });
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) || null : null;
  const user = await db.user.create({
    data: {
      email,
      name,
      passwordHash: await hash(password, 10),
      // Carry whatever the visitor already learned as a guest into the account.
      progress: { create: { data: normalizeProgress(body.progress) } },
    },
    select: { id: true, email: true, name: true },
  });

  await setSessionCookie(await signSession(user.id));
  return NextResponse.json({ user });
}
