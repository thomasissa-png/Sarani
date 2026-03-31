import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inboxItems } from "@/lib/db/schema";
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

// ─── GET /api/admin/cron/project-scan ───────────────────────────────────────
// PROTO-PROJECT-FOLLOWUP: scan ClickUp for projects needing attention.

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
          const taskAlerts = detectAlerts(task, space.name);
          allAlerts.push(...taskAlerts);
        }
      }
    }

    // Create inbox_items for each alert
    let createdCount = 0;
    for (const alert of allAlerts) {
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
      details: allAlerts.map((a) => ({
        level: a.level,
        taskName: a.taskName,
        reason: a.reason,
        space: a.spaceName,
      })),
    });
  } catch (error) {
    console.error("[Cron Project-Scan] Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to scan projects";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
