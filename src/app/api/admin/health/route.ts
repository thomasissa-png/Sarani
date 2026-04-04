import { NextResponse } from "next/server";
import { getCronHeartbeats, isCronRunning } from "@/lib/cron-scheduler";

// ─── Health Check Endpoint ─────────────────────────────────────────────────
// SSR: dynamic — checks cron health + external APIs.
// Returns overall status: "healthy" | "degraded" | "down".
// Uses real in-memory heartbeats from the cron scheduler (not DB proxy).

interface HealthCheck {
  ok: boolean;
  lastRun: string | null;
}

interface HealthResponse {
  status: "healthy" | "degraded" | "down";
  schedulerRunning: boolean;
  checks: {
    cronPollEmails: HealthCheck;
    cronScanKnowledge: HealthCheck;
    clickupApi: { ok: boolean };
    emailApi: { ok: boolean };
  };
}

/**
 * Check if a cron job heartbeat is healthy.
 * Healthy = scheduler running AND (never ran yet OR last ran within 2× its interval).
 * The 2× margin avoids false alarms (one missed tick is OK, two consecutive is not).
 */
function checkCronHealth(
  name: string,
  heartbeats: ReturnType<typeof getCronHeartbeats>,
): HealthCheck {
  const hb = heartbeats[name];
  if (!hb || hb.lastRun === 0) {
    // Never ran yet — OK if scheduler just started
    return { ok: isCronRunning(), lastRun: null };
  }
  const age = Date.now() - hb.lastRun;
  const maxAge = hb.intervalMs * 2.5; // 2.5× interval = grace period
  return {
    ok: age < maxAge && hb.consecutiveErrors < 3,
    lastRun: new Date(hb.lastRun).toISOString(),
  };
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const heartbeats = getCronHeartbeats();

  // ─── Check 1 & 2: cron heartbeats (real, not DB proxy) ───────────────────
  const cronPollEmails = checkCronHealth("poll-emails", heartbeats);
  const cronScanKnowledge = checkCronHealth("scan-knowledge", heartbeats);

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

  return NextResponse.json({ status, schedulerRunning: isCronRunning(), checks });
}
