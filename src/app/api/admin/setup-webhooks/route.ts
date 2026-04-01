import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { graphSubscriptions } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

// ─── Types ─────────────────────────────────────────────────────────────────

interface SetupReport {
  outlook: "active" | "created" | "error" | "not_configured";
  clickup: "active" | "created" | "error" | "not_configured";
  lark: "ok" | "manual_setup_required" | "not_configured";
  details: {
    outlook?: string;
    clickup?: string;
    lark?: string;
  };
}

interface ClickUpWebhookResponse {
  id: string;
  webhook: {
    id: string;
    endpoint: string;
    events: string[];
  };
}

interface ClickUpWebhookListResponse {
  webhooks: Array<{
    id: string;
    endpoint: string;
    events: string[];
    health: { status: string };
  }>;
}

// ─── Outlook Graph setup ───────────────────────────────────────────────────

async function setupOutlookSubscription(
  baseUrl: string
): Promise<{ status: "active" | "created" | "error"; detail: string }> {
  // Check if we have an active, non-expired subscription
  const existingSubs = await db
    .select()
    .from(graphSubscriptions)
    .orderBy(desc(graphSubscriptions.createdAt))
    .limit(1);

  if (existingSubs.length > 0) {
    const sub = existingSubs[0];
    if (sub.expirationDateTime > new Date()) {
      return {
        status: "active",
        detail: `Subscription ${sub.subscriptionId} active until ${sub.expirationDateTime.toISOString()}`,
      };
    }
  }

  // Create new subscription by calling our own graph-subscriptions endpoint
  const response = await fetch(`${baseUrl}/api/admin/graph-subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const errorBody: string = await response.text();
    return {
      status: "error",
      detail: `Failed to create Graph subscription: ${response.status} ${errorBody}`,
    };
  }

  const result: { subscriptionId: string; expirationDateTime: string } =
    await response.json();
  return {
    status: "created",
    detail: `Created subscription ${result.subscriptionId}, expires ${result.expirationDateTime}`,
  };
}

// ─── ClickUp webhook setup ─────────────────────────────────────────────────

async function setupClickUpWebhook(
  appUrl: string
): Promise<{ status: "active" | "created" | "error"; detail: string }> {
  const apiKey: string | undefined = process.env.CLICKUP_API_KEY;
  const workspaceId: string | undefined = process.env.CLICKUP_WORKSPACE_ID;
  const webhookSecret: string | undefined = process.env.CLICKUP_WEBHOOK_SECRET;

  if (!apiKey || !workspaceId) {
    return { status: "error", detail: "CLICKUP_API_KEY or CLICKUP_WORKSPACE_ID not configured" };
  }
  if (!webhookSecret) {
    return { status: "error", detail: "CLICKUP_WEBHOOK_SECRET not configured" };
  }

  const targetEndpoint = `${appUrl}/api/webhooks/clickup`;

  // Check existing webhooks
  try {
    const listResponse = await fetch(
      `https://api.clickup.com/api/v2/team/${workspaceId}/webhook`,
      {
        headers: { Authorization: apiKey },
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (listResponse.ok) {
      const listData: ClickUpWebhookListResponse = await listResponse.json();
      const existingWebhook = listData.webhooks.find(
        (wh) => wh.endpoint === targetEndpoint
      );

      if (existingWebhook) {
        return {
          status: "active",
          detail: `Webhook ${existingWebhook.id} already registered for ${targetEndpoint}`,
        };
      }
    }
  } catch (error) {
    console.warn(
      "[Setup Webhooks] Could not list ClickUp webhooks, attempting creation:",
      error
    );
  }

  // Create new webhook
  try {
    const createResponse = await fetch(
      `https://api.clickup.com/api/v2/team/${workspaceId}/webhook`,
      {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endpoint: targetEndpoint,
          events: ["taskStatusUpdated"],
          secret: webhookSecret,
        }),
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (!createResponse.ok) {
      const errorBody: string = await createResponse.text();
      return {
        status: "error",
        detail: `ClickUp API ${createResponse.status}: ${errorBody}`,
      };
    }

    const created: ClickUpWebhookResponse = await createResponse.json();
    return {
      status: "created",
      detail: `Created webhook ${created.id ?? created.webhook?.id} for ${targetEndpoint}`,
    };
  } catch (error) {
    return {
      status: "error",
      detail: `ClickUp webhook creation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

// ─── Lark setup check ──────────────────────────────────────────────────────

function checkLarkSetup(): { status: "ok" | "manual_setup_required" | "not_configured"; detail: string } {
  const verificationToken: string | undefined = process.env.LARK_VERIFICATION_TOKEN;
  const appId: string | undefined = process.env.LARK_APP_ID;
  const appSecret: string | undefined = process.env.LARK_APP_SECRET;

  if (!verificationToken || !appId || !appSecret) {
    return {
      status: "not_configured",
      detail: "Missing LARK_VERIFICATION_TOKEN, LARK_APP_ID, or LARK_APP_SECRET. Configure in Replit Secrets.",
    };
  }

  // Lark webhook registration is done in the Developer Console, not via API.
  // We can only verify that the env vars are set.
  return {
    status: "manual_setup_required",
    detail:
      "Lark env vars are configured. Register the webhook URL in Lark Developer Console: " +
      "Event Subscriptions > Request URL > set to {APP_URL}/api/webhooks/lark. " +
      "Enable event: im.message.receive_v1.",
  };
}

// ─── POST /api/admin/setup-webhooks ────────────────────────────────────────
// Idempotent endpoint to create/verify all webhook subscriptions.

export async function POST(request: NextRequest) {
  // Admin auth (same pattern as graph-subscriptions)
  const session = await getUserFromSession();
  if (!session || session.role !== "admin") {
    // Also support Bearer token auth for CLI/curl usage
    const authHeader: string | null = request.headers.get("authorization");
    const adminToken: string | undefined = process.env.ADMIN_TOKEN;
    if (!adminToken || authHeader !== `Bearer ${adminToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const appUrl: string | undefined =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BASE_URL;

  if (!appUrl) {
    return NextResponse.json(
      { error: "APP_URL, NEXT_PUBLIC_APP_URL, or BASE_URL must be configured" },
      { status: 500 }
    );
  }

  // Run all checks. Outlook needs internal fetch so we pass the appUrl.
  const [outlookResult, clickupResult] = await Promise.all([
    setupOutlookSubscription(appUrl).catch((e: unknown) => ({
      status: "error" as const,
      detail: `Outlook error: ${e instanceof Error ? e.message : "Unknown"}`,
    })),
    setupClickUpWebhook(appUrl).catch((e: unknown) => ({
      status: "error" as const,
      detail: `ClickUp error: ${e instanceof Error ? e.message : "Unknown"}`,
    })),
  ]);

  const larkResult = checkLarkSetup();

  const report: SetupReport = {
    outlook: outlookResult.status,
    clickup: clickupResult.status,
    lark: larkResult.status,
    details: {
      outlook: outlookResult.detail,
      clickup: clickupResult.detail,
      lark: larkResult.detail,
    },
  };

  console.log("[Setup Webhooks] Report:", JSON.stringify(report, null, 2));

  return NextResponse.json(report);
}
