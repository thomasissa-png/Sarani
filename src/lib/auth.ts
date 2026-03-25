import { cookies } from "next/headers";

const SESSION_COOKIE = "sarani_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// ─── HMAC-based session ─────────────────────────────────────────────────────
// Instead of an in-memory Map (which doesn't work across Edge/Node runtimes),
// we use a signed cookie. The cookie value is: `expiry.signature` where
// signature = HMAC-SHA256(ADMIN_PASSWORD, "sarani-session:" + expiry).
// Both middleware (Edge) and API routes (Node) can verify independently.

const encoder = new TextEncoder();

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

function hmacSignSync(secret: string, data: string): string {
  // For middleware (sync context), use Node crypto if available, else block on subtle
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeCrypto = typeof require !== "undefined" ? require("crypto") : null;
  if (nodeCrypto?.createHmac) {
    return nodeCrypto.createHmac("sha256", secret).update(data).digest("hex");
  }
  // Fallback: shouldn't happen in practice
  return "";
}

async function createSignedToken(secret: string): Promise<string> {
  const expiry = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = `sarani-session:${expiry}`;
  const signature = await hmacSign(secret, payload);
  return `${expiry}.${signature}`;
}

async function verifySignedToken(token: string, secret: string): Promise<boolean> {
  const dotIndex = token.indexOf(".");
  if (dotIndex === -1) return false;

  const expiry = parseInt(token.substring(0, dotIndex), 10);
  if (isNaN(expiry) || Date.now() >= expiry) return false;

  const signature = token.substring(dotIndex + 1);
  const payload = `sarani-session:${expiry}`;
  const expected = await hmacSign(secret, payload);

  return signature === expected;
}

function verifySignedTokenSync(token: string, secret: string): boolean {
  const dotIndex = token.indexOf(".");
  if (dotIndex === -1) return false;

  const expiry = parseInt(token.substring(0, dotIndex), 10);
  if (isNaN(expiry) || Date.now() >= expiry) return false;

  const signature = token.substring(dotIndex + 1);
  const payload = `sarani-session:${expiry}`;
  const expected = hmacSignSync(secret, payload);
  if (!expected) return false;

  return signature === expected;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function verifyPassword(password: string): { valid: boolean; reason?: "not_configured" | "wrong_password" } {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error("ADMIN_PASSWORD env var is not set — login will always fail");
    return { valid: false, reason: "not_configured" };
  }
  if (password !== adminPassword) {
    return { valid: false, reason: "wrong_password" };
  }
  return { valid: true };
}

export async function createSession(): Promise<void> {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error("ADMIN_PASSWORD not configured");
  }

  const token = await createSignedToken(adminPassword);

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

  return verifySignedToken(sessionCookie.value, adminPassword);
}

/**
 * Check auth from a raw cookie header string (for middleware — sync context).
 */
export function isAuthenticatedFromCookie(
  cookieHeader: string | null
): boolean {
  if (!cookieHeader) return false;

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;

  const parsedCookies = parseCookies(cookieHeader);
  const sessionValue = parsedCookies[SESSION_COOKIE];
  if (!sessionValue) return false;

  return verifySignedTokenSync(sessionValue, adminPassword);
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key) result[key] = rest.join("=");
  }
  return result;
}
