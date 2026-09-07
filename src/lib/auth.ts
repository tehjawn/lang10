import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { dbEnabled, getDb } from "./db";

export const SESSION_COOKIE = "lang10_session";
const SESSION_DAYS = 30;

/**
 * Accounts require both a database and a signing secret. When either is absent
 * the app runs in local-only mode and the auth routes report themselves off.
 */
export const authEnabled = dbEnabled && Boolean(process.env.AUTH_SECRET);

const secret = () => {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(value);
};

export type SessionUser = { id: string; email: string; name: string | null };

export async function signSession(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Resolves the signed-in user, or null for guests and local-only mode. */
export async function currentUser(): Promise<SessionUser | null> {
  if (!authEnabled) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const id = payload.sub;
    if (!id) return null;
    const db = getDb();
    if (!db) return null;
    const user = await db.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true },
    });
    return user ?? null;
  } catch {
    return null;
  }
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function validateCredentials(email: string, password: string): string | null {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return "Enter a valid email address.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 200) return "Password is too long.";
  return null;
}
