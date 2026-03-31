import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { graphSubscriptions } from "@/lib/db/schema";
import { lt, eq } from "drizzle-orm";
import { graphFetch } from "@/lib/integrations/sharepoint";

// ─── Constants ──────────────────────────────────────────────────────────────

// Renew subscriptions expiring within the next 12 hours
const RENEWAL_WINDOW_MS = 12 * 60 * 60 * 1000;
// New expiration: 48 hours from now (Graph max for mail = 4230 min, we use 2880)
const SUBSCRIPTION_DURATION_MINUTES = 48 * 60;

// ─── Graph API types ────────────────────────────────────────────────────────

interface GraphSubscriptionRenewResponse {
  id: string;
  expirationDateTime: string;
}

// ─── Auth helper ────────────────────────────────────────────────────────────

function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("x-cron-secret");
  return header === secret;
}

// ─── GET /api/admin/cron/renew-subscriptions ────────────────────────────────
// Renew Graph subscriptions that expire within 12 hours.

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const renewalThreshold = new Date(now.getTime() + RENEWAL_WINDOW_MS);

  try {
    // Find subscriptions expiring within the window that haven't already expired
    const expiringSubscriptions = await db
      .select()
      .from(graphSubscriptions)
      .where(
        lt(graphSubscriptions.expirationDateTime, renewalThreshold)
      );

    // Filter to only those not yet expired (still active)
    const activeExpiring = expiringSubscriptions.filter(
      (sub) => sub.expirationDateTime > now
    );

    let renewed = 0;
    let failed = 0;
    const details: Array<{
      subscriptionId: string;
      status: "renewed" | "failed";
      newExpiration?: string;
      error?: string;
    }> = [];

    for (const sub of activeExpiring) {
      const newExpirationDateTime = new Date(
        Date.now() + SUBSCRIPTION_DURATION_MINUTES * 60 * 1000
      ).toISOString();

      try {
        const result = await graphFetch<GraphSubscriptionRenewResponse>(
          `/subscriptions/${sub.subscriptionId}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              expirationDateTime: newExpirationDateTime,
            }),
          }
        );

        // Update our DB record
        await db
          .update(graphSubscriptions)
          .set({
            expirationDateTime: new Date(result.expirationDateTime),
            renewedAt: new Date(),
          })
          .where(eq(graphSubscriptions.id, sub.id));

        renewed++;
        details.push({
          subscriptionId: sub.subscriptionId,
          status: "renewed",
          newExpiration: result.expirationDateTime,
        });

        console.log(
          `[Cron Renew-Subscriptions] Renewed ${sub.subscriptionId} — new expiration: ${result.expirationDateTime}`
        );
      } catch (error) {
        failed++;
        const message =
          error instanceof Error ? error.message : "Unknown error";
        details.push({
          subscriptionId: sub.subscriptionId,
          status: "failed",
          error: message,
        });

        console.error(
          `[Cron Renew-Subscriptions] Failed to renew ${sub.subscriptionId}:`,
          error
        );
      }
    }

    return NextResponse.json({
      renewed,
      failed,
      checked: activeExpiring.length,
      details,
    });
  } catch (error) {
    console.error("[Cron Renew-Subscriptions] Fatal error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to renew subscriptions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
