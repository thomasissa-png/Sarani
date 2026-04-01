import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inboxItems, projectTeams } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  getSpaces,
  getListsForSpace,
  getTasksForList,
  checkHealth,
  type ClickUpTask,
} from "@/lib/integrations/clickup";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProjectAlert {
  level: "red" | "orange" | "yellow";
  reason: string;
  taskId: string;
  taskName: string;
  taskUrl: string;
  status: string;
  dueDate: string | null;
  lastUpdate: string;
  spaceName: string;
}

// ─── Auth helper ────────────────────────────────────────────────────────────

function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("x-cron-secret");
  return header === secret;
}

// ─── Alert detection ────────────────────────────────────────────────────────

const CLOSED_STATUSES = ["closed", "invoiced", "approved"];
const CLIENT_REVIEW_STATUS = "client review";

function detectAlerts(
  task: ClickUpTask,
  spaceName: string
): ProjectAlert[] {
  const alerts: ProjectAlert[] = [];
  const now = Date.now();
  const statusLower = task.status.status.toLowerCase();

  // Skip closed/invoiced/approved tasks
  if (CLOSED_STATUSES.includes(statusLower)) return alerts;

  const lastUpdate = parseInt(task.date_updated, 10);
  const dueDate = task.due_date ? parseInt(task.due_date, 10) : null;
  const daysSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60 * 24);

  const baseAlert = {
    taskId: task.id,
    taskName: task.name,
    taskUrl: task.url,
    status: task.status.status,
    dueDate: task.due_date,
    lastUpdate: task.date_updated,
    spaceName,
  };

  // 🔴 Deadline < 24h without review completed
  if (dueDate && dueDate - now < 24 * 60 * 60 * 1000 && dueDate > now) {
    if (statusLower !== "client review" && statusLower !== "approved") {
      alerts.push({
        ...baseAlert,
        level: "red",
        reason: `Deadline in less than 24h (${new Date(dueDate).toISOString()}) — status is "${task.status.status}", not yet in client review.`,
      });
    }
  }

  // 🟠 Projects in "Client Review" for > 48h
  if (statusLower === CLIENT_REVIEW_STATUS && daysSinceUpdate > 2) {
    alerts.push({
      ...baseAlert,
      level: "orange",
      reason: `In "Client Review" for ${Math.round(daysSinceUpdate)} days without response.`,
    });
  }

  // 🟡 Projects without update for > 5 days (all statuses except closed)
  if (daysSinceUpdate > 5) {
    alerts.push({
      ...baseAlert,
      level: "yellow",
      reason: `No update for ${Math.round(daysSinceUpdate)} days.`,
    });
  }

  return alerts;
}

// ─── Review intake helpers ─────────────────────────────────────────────────

const REVIEW_STATUSES = ["review", "internal review"];

/**
 * Check if a task has already been ingested for review (dedup).
 * Looks for existing inbox items with PROTO-REVIEW-INTAKE for this task
 * that are not in a terminal/returned state.
 */
async function isReviewIngested(taskId: string): Promise<boolean> {
  const existing = await db
    .select({ id: inboxItems.id })
    .from(inboxItems)
    .where(
      and(
        eq(inboxItems.sourceId, taskId),
        eq(inboxItems.protocol, "PROTO-REVIEW-INTAKE")
      )
    )
    .limit(1);

  return existing.length > 0;
}

/**
 * Classify whether a project is AI-managed or human-managed.
 * 1. Check ClickUp tag "ai-managed" (takes precedence)
 * 2. Check DB: project created via /api/admin/teams
 * 3. Else: human project
 */
async function classifyProject(task: ClickUpTask): Promise<boolean> {
  // Check tag first (manual override)
  if (task.tags?.some((t) => t.name.toLowerCase() === "ai-managed")) {
    return true;
  }

  // Check DB: any project_teams row linked to this ClickUp task
  // Projects created via /api/admin/teams are AI-managed
  const aiProjects = await db
    .select({ id: projectTeams.id })
    .from(projectTeams)
    .where(eq(projectTeams.name, task.name))
    .limit(1);

  return aiProjects.length > 0;
}

/**
 * Trigger Arya LLM pre-verification as a background job.
 * Calls the verify-deliverables endpoint internally.
 */
async function triggerAryaVerification(task: ClickUpTask): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : "http://localhost:3000");

  const url = `${baseUrl}/api/admin/arya/verify-deliverables`;

  // Extract deliverable links from description (URLs)
  const deliverableLinks: string[] = [];
  if (task.description) {
    const urlRegex = /https?:\/\/[^\s)>\]]+/g;
    const matches = task.description.match(urlRegex);
    if (matches) deliverableLinks.push(...matches);
  }

  try {
    // Fire-and-forget is NOT safe on Replit autoscale, but we use
    // a POST to our own API which runs synchronously within its own
    // request lifecycle. We await the fetch but don't block cron response.
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Use cron secret as session proxy for internal calls
        "x-internal-cron": process.env.CRON_SECRET ?? "",
      },
      body: JSON.stringify({
        clickupTaskId: task.id,
        taskName: task.name,
        brief: task.description ?? "",
        deliverableLinks,
      }),
    });

    if (!response.ok) {
      console.error(
        `[Cron Review] Arya verification failed for task ${task.id}:`,
        response.status
      );
    }
  } catch (error) {
    console.error(
      `[Cron Review] Failed to trigger Arya verification for task ${task.id}:`,
      error
    );
  }
}

/**
 * Create an inbox item for human review.
 */
async function createReviewInboxItem(task: ClickUpTask, spaceName: string): Promise<void> {
  await db.insert(inboxItems).values({
    type: "review_human",
    status: "pending",
    title: `Review Ready — ${task.name}`,
    summary: JSON.stringify({
      clickupTaskId: task.id,
      taskName: task.name,
      taskUrl: task.url,
      spaceName,
    }),
    sourceId: task.id,
    sourceType: "cron",
    protocol: "PROTO-REVIEW-INTAKE",
    projectId: task.id,
    priority: "medium",
  });
}

interface ReviewIntakeResult {
  taskId: string;
  taskName: string;
  isAI: boolean;
  action: "human_inbox" | "arya_triggered" | "skipped_duplicate";
}

// ─── GET /api/admin/cron/project-scan ───────────────────────────────────────
// PROTO-PROJECT-FOLLOWUP: scan ClickUp for projects needing attention.
// PROTO-REVIEW-INTAKE: detect Review status and route to human/AI flow.

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ClickUp is configured and reachable
  const health = await checkHealth();
  if (health.status !== "connected") {
    return NextResponse.json(
      {
        error: "ClickUp not available",
        detail: health.error ?? health.status,
      },
      { status: 503 }
    );
  }

  const allAlerts: ProjectAlert[] = [];
  const reviewResults: ReviewIntakeResult[] = [];

  try {
    const spaces = await getSpaces();

    for (const space of spaces) {
      const lists = await getListsForSpace(space.id);

      for (const list of lists) {
        // Fetch first page of tasks (most recent, up to 100)
        // We only need recent/active tasks for the scan
        const { tasks } = await getTasksForList(list.id, {
          page: 0,
          includeSubtasks: false,
        });

        for (const task of tasks) {
          // PROTO-PROJECT-FOLLOWUP: detect alerts
          const taskAlerts = detectAlerts(task, space.name);
          allAlerts.push(...taskAlerts);

          // PROTO-REVIEW-INTAKE: detect Review status transitions
          const statusLower = task.status.status.toLowerCase();
          if (REVIEW_STATUSES.includes(statusLower)) {
            const alreadyIngested = await isReviewIngested(task.id);
            if (alreadyIngested) {
              reviewResults.push({
                taskId: task.id,
                taskName: task.name,
                isAI: false,
                action: "skipped_duplicate",
              });
              continue;
            }

            const isAI = await classifyProject(task);

            if (isAI) {
              await triggerAryaVerification(task);
              reviewResults.push({
                taskId: task.id,
                taskName: task.name,
                isAI: true,
                action: "arya_triggered",
              });
            } else {
              await createReviewInboxItem(task, space.name);
              reviewResults.push({
                taskId: task.id,
                taskName: task.name,
                isAI: false,
                action: "human_inbox",
              });
            }
          }
        }
      }
    }

    // Create inbox_items for each alert (with dedup to prevent flooding)
    let createdCount = 0;
    for (const alert of allAlerts) {
      // Dedup: skip if a pending/in_progress alert already exists for this task
      const existingAlert = await db
        .select({ id: inboxItems.id })
        .from(inboxItems)
        .where(
          and(
            eq(inboxItems.sourceId, alert.taskId),
            eq(inboxItems.type, "followup_alert"),
            eq(inboxItems.status, "pending")
          )
        )
        .limit(1);

      if (existingAlert.length > 0) continue;

      const emoji =
        alert.level === "red" ? "🔴" : alert.level === "orange" ? "🟠" : "🟡";

      await db.insert(inboxItems).values({
        type: "followup_alert",
        status: "pending",
        title: `${emoji} ${alert.taskName} — ${alert.reason.slice(0, 200)}`,
        summary: JSON.stringify(alert),
        sourceId: alert.taskId,
        sourceType: "cron",
        protocol: "PROTO-PROJECT-FOLLOWUP",
        projectId: alert.taskId,
        priority:
          alert.level === "red"
            ? "high"
            : alert.level === "orange"
              ? "medium"
              : "low",
      });
      createdCount++;
    }

    return NextResponse.json({
      alerts: createdCount,
      reviews: reviewResults.filter((r) => r.action !== "skipped_duplicate").length,
      details: allAlerts.map((a) => ({
        level: a.level,
        taskName: a.taskName,
        reason: a.reason,
        space: a.spaceName,
      })),
      reviewDetails: reviewResults,
    });
  } catch (error) {
    console.error("[Cron Project-Scan] Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to scan projects";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
