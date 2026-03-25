import { cookies } from "next/headers";

const SESSION_COOKIE = "sarani_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Generate a deterministic session token from the password.
 * Uses Web Crypto API (works in both Node.js and Edge runtime).
 */
async function generateSessionToken(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`sarani-admin-${password}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Synchronous token generation for middleware (no async subtle.digest).
 * Uses a simple string-based comparison instead.
 */
function generateSessionTokenSync(password: string): string {
  // Simple deterministic hash for middleware use
  let hash = 0;
  const str = `sarani-admin-${password}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  // Combine with base64 of the password for uniqueness
  return `s_${Math.abs(hash).toString(36)}_${btoa(str).slice(0, 32)}`;
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

  const token = generateSessionTokenSync(adminPassword);
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

  const expectedToken = generateSessionTokenSync(adminPassword);
  return sessionCookie.value === expectedToken;
}

/**
 * Check auth from a raw cookie header string (for middleware).
 */
export function isAuthenticatedFromCookie(
  cookieHeader: string | null
): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || !cookieHeader) return false;

  const parsedCookies = parseCookies(cookieHeader);
  const sessionValue = parsedCookies[SESSION_COOKIE];
  if (!sessionValue) return false;

  const expectedToken = generateSessionTokenSync(adminPassword);
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
