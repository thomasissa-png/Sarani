import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inboxItems } from "@/lib/db/schema";
import { eq, and, gte } from "drizzle-orm";
import {
  getSpaces,
  getListsForSpace,
  getTasksForList,
  checkHealth,
  type ClickUpTask,
} from "@/lib/integrations/clickup";

// ─── Auth helper ────────────────────────────────────────────────────────────

function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("x-cron-secret");
  return header === secret;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const CLOSED_STATUSES = ["closed", "invoiced", "approved"];
const SAFE_STATUSES = ["review", "client review", "closed", "invoiced", "approved"];
const ALERT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEDUP_WINDOW_HOURS = 12; // Don't re-alert within 12 hours for same task

// ─── Helpers ────────────────────────────────────────────────────────────────

async function wasAlertSentRecently(taskId: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - DEDUP_WINDOW_HOURS * 60 * 60 * 1000);

  const existing = await db
    .select({ id: inboxItems.id })
    .from(inboxItems)
    .where(
      and(
        eq(inboxItems.type, "deadline_alert"),
        eq(inboxItems.sourceId, taskId),
        gte(inboxItems.createdAt, cutoff)
      )
    )
    .limit(1);

  return existing.length > 0;
}

// ─── GET /api/admin/cron/deadline-alerts ────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const health = await checkHealth();
    if (health.status !== "connected") {
      return NextResponse.json({
        status: "degraded",
        reason: "ClickUp API unreachable — deadline check skipped",
      });
    }

    const spaces = await getSpaces();
    const now = Date.now();
    const alertThreshold = now + ALERT_WINDOW_MS;
    let alertsCreated = 0;
    let tasksScanned = 0;

    for (const space of spaces) {
      let lists: Awaited<ReturnType<typeof getListsForSpace>>;
      try {
        lists = await getListsForSpace(space.id);
      } catch {
        continue;
      }

      for (const list of lists) {
        let tasks: ClickUpTask[];
        try {
          const result = await getTasksForList(list.id, { page: 0, includeSubtasks: false });
          tasks = result.tasks;
        } catch {
          continue;
        }

        for (const task of tasks) {
          tasksScanned++;
          const statusLower = task.status.status.toLowerCase();

          // Skip closed tasks
          if (CLOSED_STATUSES.includes(statusLower)) continue;

          // Skip tasks already in review or later stages
          if (SAFE_STATUSES.includes(statusLower)) continue;

          const dueDate = task.due_date ? parseInt(task.due_date, 10) : null;
          if (!dueDate) continue;

          // Only alert if deadline is within next 24 hours (and not already past)
          if (dueDate > now && dueDate <= alertThreshold) {
            // Dedup check
            const alreadyAlerted = await wasAlertSentRecently(task.id);
            if (alreadyAlerted) continue;

            const hoursUntilDue = Math.round((dueDate - now) / (1000 * 60 * 60));
            const dueStr = new Date(dueDate).toLocaleString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZoneName: "short",
            });

            await db.insert(inboxItems).values({
              type: "deadline_alert",
              status: "pending",
              title: `Deadline in ${hoursUntilDue}h: ${task.name} (${space.name})`,
              summary: JSON.stringify({
                text: `"${task.name}" is due in ${hoursUntilDue} hours (${dueStr}). Current status: "${task.status.status}". This project is not yet in review — action may be needed.`,
                taskId: task.id,
                taskName: task.name,
                taskUrl: task.url,
                spaceName: space.name,
                status: task.status.status,
                dueDate: dueDate,
                hoursUntilDue,
              }),
              sourceId: task.id,
              sourceType: "cron",
              protocol: null,
              priority: hoursUntilDue <= 6 ? "high" : "medium",
            });

            alertsCreated++;
          }
        }
      }
    }

    return NextResponse.json({
      status: "ok",
      tasksScanned,
      alertsCreated,
    });
  } catch (error) {
    console.error("[Deadline Alerts] Error:", error);
    return NextResponse.json(
      { error: "Deadline alerts failed", detail: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
