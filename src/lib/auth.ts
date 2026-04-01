import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, type User } from "@/lib/db/schema";
import {
  hashPassword,
  verifyPasswordHash,
} from "@/lib/password";

// Re-export password utilities so consumers can import from @/lib/auth
export { hashPassword, verifyPasswordHash };

const SESSION_COOKIE = "sarani_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// ─── HMAC-based session (Web Crypto API only) ───────────────────────────────
// Uses crypto.subtle exclusively — works in both Edge and Node runtimes.

const encoder = new TextEncoder();

function getSessionSecret(): string {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) throw new Error("ADMIN_PASSWORD env var is required for session signing");
  return secret;
}

async function hmacSign(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function createSignedToken(
  secret: string,
  payload: Record<string, string>
): Promise<string> {
  const expiry = Date.now() + SESSION_MAX_AGE * 1000;
  const payloadJson = JSON.stringify({ ...payload, exp: expiry });
  const payloadB64 = btoa(payloadJson);
  const signature = await hmacSign(secret, payloadB64);
  return `${payloadB64}.${signature}`;
}

async function verifySignedToken(
  token: string,
  secret: string
): Promise<{ userId: string; role: string } | null> {
  const dotIndex = token.indexOf(".");
  if (dotIndex === -1) return null;

  const payloadB64 = token.substring(0, dotIndex);
  const signature = token.substring(dotIndex + 1);

  const expected = await hmacSign(secret, payloadB64);
  if (signature !== expected) return null;

  try {
    const payload = JSON.parse(atob(payloadB64));
    if (!payload.exp || Date.now() >= payload.exp) return null;
    if (!payload.userId || !payload.role) return null;
    return { userId: payload.userId, role: payload.role };
  } catch {
    return null;
  }
}

// ─── Legacy token support (old format: "expiry.signature") ──────────────────

async function verifyLegacyToken(token: string, secret: string): Promise<boolean> {
  const dotIndex = token.indexOf(".");
  if (dotIndex === -1) return false;

  const expiry = parseInt(token.substring(0, dotIndex), 10);
  if (isNaN(expiry) || Date.now() >= expiry) return false;

  const signature = token.substring(dotIndex + 1);
  const payload = `sarani-session:${expiry}`;
  const expected = await hmacSign(secret, payload);
  return signature === expected;
}

// ─── Authentication ─────────────────────────────────────────────────────────

export async function authenticateUser(
  email: string,
  password: string
): Promise<{ user: Omit<User, "passwordHash">; error?: never } | { user?: never; error: string }> {
  // Try DB-based auth first
  const [dbUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);

  if (dbUser) {
    const valid = await verifyPasswordHash(password, dbUser.passwordHash);
    if (!valid) return { error: "invalid_credentials" };
    const { passwordHash: _, ...userWithoutHash } = dbUser;
    return { user: userWithoutHash };
  }

  // Legacy fallback: if email matches admin@sarani.studio and password matches ADMIN_PASSWORD,
  // allow login (for bootstrapping before first user is seeded)
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (
    adminPassword &&
    email.toLowerCase().trim() === "admin@sarani.studio" &&
    password === adminPassword
  ) {
    return {
      user: {
        id: "legacy-admin",
        email: "admin@sarani.studio",
        name: "Admin",
        role: "admin",
        clickupUserId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
  }

  return { error: "invalid_credentials" };
}

// ─── Session management ─────────────────────────────────────────────────────

export async function createSession(userId: string, role: string): Promise<void> {
  const secret = getSessionSecret();
  const token = await createSignedToken(secret, { userId, role });

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

export async function getUserFromSession(): Promise<{
  userId: string;
  role: string;
} | null> {
  const secret = getSessionSecret();
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE);
  if (!sessionCookie) return null;

  // Try new token format first
  const session = await verifySignedToken(sessionCookie.value, secret);
  if (session) return session;

  // Fall back to legacy token (old format without userId/role) — treat as admin
  const legacyValid = await verifyLegacyToken(sessionCookie.value, secret);
  if (legacyValid) {
    return { userId: "legacy-admin", role: "admin" };
  }

  return null;
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getUserFromSession();
  return session !== null;
}

// ─── Middleware-compatible auth (raw cookie header) ──────────────────────────

export async function isAuthenticatedFromCookie(
  cookieHeader: string | null
): Promise<{ authenticated: boolean; role?: string; userId?: string }> {
  if (!cookieHeader) return { authenticated: false };

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return { authenticated: false };

  const parsedCookies = parseCookies(cookieHeader);
  const sessionValue = parsedCookies[SESSION_COOKIE];
  if (!sessionValue) return { authenticated: false };

  // Try new token format first
  const session = await verifySignedToken(sessionValue, adminPassword);
  if (session) {
    return { authenticated: true, role: session.role, userId: session.userId };
  }

  // Fall back to legacy token (old format without userId/role)
  const legacyValid = await verifyLegacyToken(sessionValue, adminPassword);
  if (legacyValid) {
    return { authenticated: true, role: "admin", userId: "legacy-admin" };
  }

  return { authenticated: false };
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key) result[key] = rest.join("=");
  }
  return result;
}
