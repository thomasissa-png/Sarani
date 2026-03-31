import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { graphSubscriptions } from "@/lib/db/schema";
import { getUserFromSession } from "@/lib/auth";
import { graphFetch } from "@/lib/integrations/sharepoint";

// ─── Constants ──────────────────────────────────────────────────────────────

const EMAIL_ADDRESS =
  process.env.MICROSOFT_EMAIL_ADDRESS || "team@sarani.studio";

// Graph API max subscription duration for mail: 4230 minutes (~70.5 hours)
// We use 48 hours for safety.
const SUBSCRIPTION_DURATION_MINUTES = 48 * 60; // 2880 minutes = 48 hours

// ─── Zod schemas ────────────────────────────────────────────────────────────

const createSubscriptionSchema = z.object({
  notificationUrl: z.string().url().optional(),
});

// ─── Graph API types ────────────────────────────────────────────────────────

interface GraphSubscription {
  id: string;
  resource: string;
  changeType: string;
  notificationUrl: string;
  expirationDateTime: string;
  clientState: string;
}

// ─── POST /api/admin/graph-subscriptions ────────────────────────────────────
// Create a new Graph API subscription for incoming emails.

export async function POST(request: NextRequest) {
  try {
    const session = await getUserFromSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const webhookSecret = process.env.GRAPH_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json(
        { error: "GRAPH_WEBHOOK_SECRET not configured" },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL;
    if (!baseUrl) {
      return NextResponse.json(
        { error: "BASE_URL or NEXT_PUBLIC_APP_URL not configured" },
        { status: 500 }
      );
    }

    // Allow override of notification URL (for testing with ngrok, etc.)
    let notificationUrl = `${baseUrl}/api/webhooks/graph-mail`;
    const body = await request.json().catch(() => ({}));
    const parsed = createSubscriptionSchema.safeParse(body);
    if (parsed.success && parsed.data.notificationUrl) {
      notificationUrl = parsed.data.notificationUrl;
    }

    // Calculate expiration: now + SUBSCRIPTION_DURATION_MINUTES
    const expirationDateTime = new Date(
      Date.now() + SUBSCRIPTION_DURATION_MINUTES * 60 * 1000
    ).toISOString();

    const resource = `/users/${encodeURIComponent(EMAIL_ADDRESS)}/mailFolders('Inbox')/messages`;

    // Create subscription via Graph API
    const subscription = await graphFetch<GraphSubscription>(
      "/subscriptions",
      {
        method: "POST",
        body: JSON.stringify({
          changeType: "created",
          notificationUrl,
          resource,
          expirationDateTime,
          clientState: webhookSecret,
        }),
      }
    );

    // Store in our DB for renewal tracking
    await db.insert(graphSubscriptions).values({
      subscriptionId: subscription.id,
      resource,
      expirationDateTime: new Date(subscription.expirationDateTime),
      clientState: webhookSecret,
    });

    return NextResponse.json({
      subscriptionId: subscription.id,
      resource,
      expirationDateTime: subscription.expirationDateTime,
      notificationUrl,
    });
  } catch (error) {
    console.error("[Graph Subscriptions] Error creating subscription:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create subscription";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── GET /api/admin/graph-subscriptions ─────────────────────────────────────
// List active Graph subscriptions from our DB.

export async function GET(_request: NextRequest) {
  try {
    const session = await getUserFromSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscriptions = await db
      .select()
      .from(graphSubscriptions);

    return NextResponse.json({
      subscriptions: subscriptions.map((sub) => ({
        id: sub.id,
        subscriptionId: sub.subscriptionId,
        resource: sub.resource,
        expirationDateTime: sub.expirationDateTime.toISOString(),
        createdAt: sub.createdAt.toISOString(),
        renewedAt: sub.renewedAt?.toISOString() ?? null,
        isExpired: sub.expirationDateTime < new Date(),
      })),
    });
  } catch (error) {
    console.error("[Graph Subscriptions] Error listing subscriptions:", error);
    const message =
      error instanceof Error ? error.message : "Failed to list subscriptions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
