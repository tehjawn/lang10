import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { authEnabled, normalizeEmail, setSessionCookie, signSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST(request: Request) {
  if (!authEnabled) {
    return NextResponse.json({ error: "Accounts are not enabled on this server." }, { status: 503 });
  }
  const db = getDb()!;

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = normalizeEmail(body.email ?? "");
  const password = body.password ?? "";
  const user = await db.user.findUnique({ where: { email } });

  // Same message and roughly the same work either way, so the response does not
  // reveal whether an address is registered.
  const ok = user ? await compare(password, user.passwordHash) : false;
  if (!user || !ok) {
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }

  await setSessionCookie(await signSession(user.id));
  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
}
