import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { inboxItems } from "@/lib/db/schema";

// ─── Types ─────────────────────────────────────────────────────────────────

const REVIEW_STATUSES = ["review", "internal review"];
const APPROVED_STATUSES = ["approved"];
const CLOSED_STATUSES = ["closed"];

// ─── Zod schemas ───────────────────────────────────────────────────────────

const clickUpStatusSchema = z.object({
  status: z.string(),
  color: z.string().optional(),
  type: z.string().optional(),
  orderindex: z.number().optional(),
});

const clickUpHistoryItemSchema = z.object({
  id: z.string(),
  field: z.string(),
  before: z.union([clickUpStatusSchema, z.string(), z.null()]).optional(),
  after: z.union([clickUpStatusSchema, z.string(), z.null()]).optional(),
});

const clickUpWebhookPayloadSchema = z.object({
  event: z.string(),
  webhook_id: z.string(),
  task_id: z.string(),
  history_items: z.array(clickUpHistoryItemSchema).optional(),
});

type ClickUpWebhookPayload = z.infer<typeof clickUpWebhookPayloadSchema>;

// ─── HMAC validation ───────────────────────────────────────────────────────

function verifyClickUpSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const computed: string = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(computed, "hex"),
    Buffer.from(signature, "hex")
  );
}

// ─── Extract new status from history_items ─────────────────────────────────

function extractNewStatus(payload: ClickUpWebhookPayload): string | null {
  const historyItems = payload.history_items ?? [];
  for (const item of historyItems) {
    if (item.field === "status" && item.after) {
      if (typeof item.after === "object" && "status" in item.after) {
        return item.after.status.toLowerCase();
      }
      if (typeof item.after === "string") {
        return item.after.toLowerCase();
      }
    }
  }
  return null;
}

// ─── Determine action from status ──────────────────────────────────────────

type ClickUpAction = "review" | "approved" | "closed" | null;

function actionFromStatus(status: string): ClickUpAction {
  const normalized: string = status.toLowerCase().trim();
  if (REVIEW_STATUSES.includes(normalized)) return "review";
  if (APPROVED_STATUSES.includes(normalized)) return "approved";
  if (CLOSED_STATUSES.includes(normalized)) return "closed";
  return null;
}

// ─── Background processing ─────────────────────────────────────────────────

async function processClickUpEvent(
  payload: ClickUpWebhookPayload,
  action: ClickUpAction
): Promise<void> {
  if (!action) return;

  const taskId: string = payload.task_id;

  const titleMap: Record<NonNullable<ClickUpAction>, string> = {
    review: `[clickup_review] Task ${taskId} moved to review`,
    approved: `[clickup_approved] Task ${taskId} approved`,
    closed: `[clickup_closed] Task ${taskId} closed`,
  };

  const protocolMap: Record<NonNullable<ClickUpAction>, string> = {
    review: "PROTO-REVIEW-PIPELINE",
    approved: "PROTO-APPROVAL-PIPELINE",
    closed: "PROTO-CLOSURE-PIPELINE",
  };

  const priorityMap: Record<NonNullable<ClickUpAction>, "high" | "medium" | "low"> = {
    review: "high",
    approved: "medium",
    closed: "low",
  };

  try {
    await db.insert(inboxItems).values({
      type: "clickup_status_change",
      status: "pending",
      title: titleMap[action],
      summary: JSON.stringify({
        taskId,
        event: payload.event,
        action,
        webhookId: payload.webhook_id,
        historyItems: payload.history_items,
      }),
      sourceId: taskId,
      sourceType: "clickup",
      protocol: protocolMap[action],
      priority: priorityMap[action],
    });

    console.log(
      `[ClickUp Webhook] Created inbox item: action=${action}, taskId=${taskId}`
    );
  } catch (error) {
    console.error(
      `[ClickUp Webhook] Error creating inbox item for task ${taskId}:`,
      error
    );
  }
}

// ─── POST handler ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Step 1: Read raw body for HMAC verification
  const rawBody: string = await request.text();

  // Step 2: Validate HMAC signature
  const secret = process.env.CLICKUP_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[ClickUp Webhook] CLICKUP_WEBHOOK_SECRET not configured");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 }
    );
  }

  const signature: string | null = request.headers.get("x-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing X-Signature header" },
      { status: 401 }
    );
  }

  let isValid: boolean;
  try {
    isValid = verifyClickUpSignature(rawBody, signature, secret);
  } catch {
    return NextResponse.json(
      { error: "Invalid signature format" },
      { status: 401 }
    );
  }

  if (!isValid) {
    console.warn("[ClickUp Webhook] Invalid HMAC signature");
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 }
    );
  }

  // Step 3: Parse and validate payload
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = clickUpWebhookPayloadSchema.safeParse(body);
  if (!parsed.success) {
    console.warn("[ClickUp Webhook] Invalid payload:", parsed.error.issues);
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const payload: ClickUpWebhookPayload = parsed.data;

  // Step 4: Only process taskStatusUpdated events
  if (payload.event !== "taskStatusUpdated") {
    return NextResponse.json({ ignored: true, event: payload.event });
  }

  // Step 5: Extract the new status and determine action
  const newStatus: string | null = extractNewStatus(payload);
  if (!newStatus) {
    console.log("[ClickUp Webhook] No status field in history_items, skipping");
    return NextResponse.json({ ignored: true, reason: "no_status_change" });
  }

  const action: ClickUpAction = actionFromStatus(newStatus);
  if (!action) {
    console.log(
      `[ClickUp Webhook] Status "${newStatus}" is not a trigger, skipping`
    );
    return NextResponse.json({ ignored: true, status: newStatus });
  }

  // Step 6: Process (await before responding -- Replit autoscale constraint)
  await processClickUpEvent(payload, action);

  return NextResponse.json({ processed: true, action, taskId: payload.task_id });
}
