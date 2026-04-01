import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inboxItems } from "@/lib/db/schema";
import { eq, desc, gte } from "drizzle-orm";

// ─── Health Check Endpoint ─────────────────────────────────────────────────
// SSR: dynamic — checks cron health + external APIs.
// Returns overall status: "healthy" | "degraded" | "down".

interface HealthCheck {
  ok: boolean;
  lastRun: string | null;
}

interface HealthResponse {
  status: "healthy" | "degraded" | "down";
  checks: {
    cronPollEmails: HealthCheck;
    cronScanKnowledge: HealthCheck;
    clickupApi: { ok: boolean };
    emailApi: { ok: boolean };
  };
}

/** Business hours check: 8h–20h UTC */
function isBusinessHours(): boolean {
  const hour = new Date().getUTCHours();
  return hour >= 8 && hour < 20;
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);

  // ─── Check 1: cron poll emails ────────────────────────────────────────────
  // If latest email_classified item was created within 15 min, cron is running.
  // Outside business hours, we don't flag it as degraded.
  let cronPollEmails: HealthCheck = { ok: true, lastRun: null };
  try {
    const [latest] = await db
      .select({ createdAt: inboxItems.createdAt })
      .from(inboxItems)
      .where(eq(inboxItems.type, "email_classified"))
      .orderBy(desc(inboxItems.createdAt))
      .limit(1);

    if (latest) {
      cronPollEmails.lastRun = latest.createdAt.toISOString();
      // Only flag as NOT ok if in business hours and last item > 15 min ago
      if (isBusinessHours() && latest.createdAt < fifteenMinAgo) {
        cronPollEmails.ok = false;
      }
    } else {
      // No items at all — flag only during business hours
      cronPollEmails.ok = !isBusinessHours();
    }
  } catch {
    cronPollEmails = { ok: false, lastRun: null };
  }

  // ─── Check 2: cron scan knowledge ─────────────────────────────────────────
  // Check for any inbox item created in last 15 min as a basic heartbeat
  let cronScanKnowledge: HealthCheck = { ok: true, lastRun: null };
  try {
    const [latest] = await db
      .select({ createdAt: inboxItems.createdAt })
      .from(inboxItems)
      .where(gte(inboxItems.createdAt, fifteenMinAgo))
      .orderBy(desc(inboxItems.createdAt))
      .limit(1);

    if (latest) {
      cronScanKnowledge.lastRun = latest.createdAt.toISOString();
    } else {
      // No recent activity — flag during business hours only
      cronScanKnowledge.ok = !isBusinessHours();
    }
  } catch {
    cronScanKnowledge = { ok: false, lastRun: null };
  }

  // ─── Check 3: ClickUp API (lightweight ping) ─────────────────────────────
  let clickupOk = true;
  try {
    const token = process.env.CLICKUP_API_TOKEN;
    if (token && token !== "...") {
      const res = await fetch("https://api.clickup.com/api/v2/user", {
        headers: { Authorization: token },
        signal: AbortSignal.timeout(5000),
      });
      clickupOk = res.ok;
    }
  } catch {
    clickupOk = false;
  }

  // ─── Check 4: Email API (Microsoft Graph token check) ────────────────────
  let emailOk = true;
  try {
    const clientId = process.env.AZURE_CLIENT_ID;
    const tenantId = process.env.AZURE_TENANT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    if (clientId && tenantId && clientSecret && clientId !== "...") {
      const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
      const res = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          scope: "https://graph.microsoft.com/.default",
          grant_type: "client_credentials",
        }),
        signal: AbortSignal.timeout(5000),
      });
      emailOk = res.ok;
    }
  } catch {
    emailOk = false;
  }

  // ─── Compute overall status ───────────────────────────────────────────────
  const checks = {
    cronPollEmails,
    cronScanKnowledge,
    clickupApi: { ok: clickupOk },
    emailApi: { ok: emailOk },
  };

  const allOk =
    cronPollEmails.ok && cronScanKnowledge.ok && clickupOk && emailOk;
  const criticalDown = !cronPollEmails.ok || !emailOk;

  const status: HealthResponse["status"] = allOk
    ? "healthy"
    : criticalDown
      ? "down"
      : "degraded";

  return NextResponse.json({ status, checks });
}
