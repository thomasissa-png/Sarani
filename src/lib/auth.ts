import { cookies } from "next/headers";

const SESSION_COOKIE = "sarani_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// ─── In-memory session store ────────────────────────────────────────────────
// Maps opaque token → expiration timestamp.
// In production with multiple instances, replace with Redis or DB lookup.

const sessionStore = new Map<string, number>();

/**
 * Generate a cryptographically random opaque session token.
 * No password or user data is encoded in the token.
 */
function generateOpaqueToken(): string {
  return crypto.randomUUID();
}

/**
 * Clean up expired sessions (called lazily on auth checks).
 */
function pruneExpiredSessions(): void {
  const now = Date.now();
  for (const [token, expiresAt] of sessionStore) {
    if (expiresAt <= now) {
      sessionStore.delete(token);
    }
  }
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
  const token = generateOpaqueToken();
  const expiresAt = Date.now() + SESSION_MAX_AGE * 1000;

  // Store token → expiry mapping
  sessionStore.set(token, expiresAt);

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
  const sessionCookie = cookieStore.get(SESSION_COOKIE);

  // Remove from store if present
  if (sessionCookie) {
    sessionStore.delete(sessionCookie.value);
  }

  cookieStore.delete(SESSION_COOKIE);
}

export async function isAuthenticated(): Promise<boolean> {
  pruneExpiredSessions();

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE);
  if (!sessionCookie) return false;

  const expiresAt = sessionStore.get(sessionCookie.value);
  if (!expiresAt) return false;

  return Date.now() < expiresAt;
}

/**
 * Check auth from a raw cookie header string (for middleware).
 */
export function isAuthenticatedFromCookie(
  cookieHeader: string | null
): boolean {
  if (!cookieHeader) return false;

  pruneExpiredSessions();

  const parsedCookies = parseCookies(cookieHeader);
  const sessionValue = parsedCookies[SESSION_COOKIE];
  if (!sessionValue) return false;

  const expiresAt = sessionStore.get(sessionValue);
  if (!expiresAt) return false;

  return Date.now() < expiresAt;
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key) result[key] = rest.join("=");
  }
  return result;
}
