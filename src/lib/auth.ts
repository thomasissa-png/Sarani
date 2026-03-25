import { cookies } from "next/headers";
import crypto from "crypto";

const SESSION_COOKIE = "sarani_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Generate a deterministic session token from the password.
 * This avoids needing a DB-backed session store for v1.
 */
function generateSessionToken(password: string): string {
  return crypto.createHash("sha256").update(`sarani-admin-${password}`).digest("hex");
}

export function verifyPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error("ADMIN_PASSWORD env var is not set");
    return false;
  }
  return password === adminPassword;
}

export async function createSession(): Promise<void> {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) throw new Error("ADMIN_PASSWORD not set");

  const token = generateSessionToken(adminPassword);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function isAuthenticated(): Promise<boolean> {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE);
  if (!sessionCookie) return false;

  const expectedToken = generateSessionToken(adminPassword);
  return sessionCookie.value === expectedToken;
}

/**
 * Check auth from a raw cookie header string (for middleware).
 */
export function isAuthenticatedFromCookie(cookieHeader: string | null): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || !cookieHeader) return false;

  const cookies = parseCookies(cookieHeader);
  const sessionValue = cookies[SESSION_COOKIE];
  if (!sessionValue) return false;

  const expectedToken = generateSessionToken(adminPassword);
  return sessionValue === expectedToken;
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key) result[key] = rest.join("=");
  }
  return result;
}
