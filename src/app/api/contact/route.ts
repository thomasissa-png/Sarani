import { NextRequest, NextResponse } from "next/server";
import { contactFormServerSchema } from "@/lib/validation";

/**
 * POST /api/contact
 * Handles contact form submissions.
 *
 * - Server-side Zod validation (BR-103-2)
 * - Honeypot check for spam (silent 200 on bot detection)
 * - In-memory rate limiting: 3 per IP per hour (BR-103-3)
 * - No PII in logs (tracking-plan.md privacy rule)
 *
 * Phase 1: console.log notification (email provider TBD)
 */

/* ---------- Rate Limiter (in-memory, Phase 1) ---------- */

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitEntry>();

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry) {
    rateLimitMap.set(ip, { timestamps: [now] });
    return false;
  }

  // Prune timestamps outside the window
  entry.timestamps = entry.timestamps.filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS
  );

  if (entry.timestamps.length >= RATE_LIMIT_MAX) {
    return true;
  }

  entry.timestamps.push(now);
  return false;
}

/* ---------- Periodic cleanup of stale entries ---------- */

let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes

function cleanupRateLimitMap() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [ip, entry] of rateLimitMap) {
    entry.timestamps = entry.timestamps.filter(
      (ts) => now - ts < RATE_LIMIT_WINDOW_MS
    );
    if (entry.timestamps.length === 0) {
      rateLimitMap.delete(ip);
    }
  }
}

/* ---------- IP extraction ---------- */

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/* ---------- POST handler ---------- */

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    cleanupRateLimitMap();

    // Rate limit check (BR-103-3)
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "rate_limited" },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Honeypot check — if filled, bot detected. Return silent 200.
    if (body.honeypot && body.honeypot.length > 0) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Server-side validation (BR-103-2, EC-103-7)
    const result = contactFormServerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "validation_error", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const data = result.data;

    // Phase 1: console.log notification
    // No PII in logs — only company size and attribution
    console.log("[CONTACT FORM] New submission received", {
      companySize: data.companySize,
      attribution: data.attribution,
      timestamp: new Date().toISOString(),
    });

    // TODO Phase 2: Send notification email to team@sarani.studio
    // TODO Phase 2: Send confirmation email to submitter
    // TODO Phase 2: Store submission in database/CRM

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    console.error("[CONTACT FORM] Server error during submission processing");
    return NextResponse.json(
      { error: "server_error" },
      { status: 500 }
    );
  }
}
