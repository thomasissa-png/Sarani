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

// ─── Types ──────────────────────────────────────────────────────────────────

interface DigestData {
  overdue: Array<{ name: string; spaceName: string; daysBehind: number; url: string }>;
  dueToday: Array<{ name: string; spaceName: string; url: string }>;
  inactive: Array<{ name: string; spaceName: string; daysSinceUpdate: number; url: string }>;
  teamLoad: Record<string, { active: number; total: number }>;
  totalActive: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const CLOSED_STATUSES = ["closed", "invoiced", "approved"];

function isTaskActive(task: ClickUpTask): boolean {
  return !CLOSED_STATUSES.includes(task.status.status.toLowerCase());
}

function buildDigestSummary(data: DigestData): string {
  const lines: string[] = [];
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  lines.push(`Daily Digest — ${today}`);
  lines.push("");

  // Overdue projects
  if (data.overdue.length > 0) {
    lines.push(`${data.overdue.length} overdue project${data.overdue.length > 1 ? "s" : ""}:`);
    for (const p of data.overdue.slice(0, 10)) {
      lines.push(`  - ${p.name} (${p.spaceName}) — ${p.daysBehind} day${p.daysBehind > 1 ? "s" : ""} overdue`);
    }
    if (data.overdue.length > 10) {
      lines.push(`  ... and ${data.overdue.length - 10} more`);
    }
    lines.push("");
  }

  // Due today
  if (data.dueToday.length > 0) {
    lines.push(`${data.dueToday.length} due today:`);
    for (const p of data.dueToday.slice(0, 10)) {
      lines.push(`  - ${p.name} (${p.spaceName})`);
    }
    lines.push("");
  }

  // Inactive
  if (data.inactive.length > 0) {
    lines.push(`${data.inactive.length} project${data.inactive.length > 1 ? "s" : ""} inactive 3+ days:`);
    for (const p of data.inactive.slice(0, 5)) {
      lines.push(`  - ${p.name} (${p.spaceName}) — ${p.daysSinceUpdate} days since last update`);
    }
    lines.push("");
  }

  // Team load by skill type (approximated by space)
  const loadEntries = Object.entries(data.teamLoad).filter(([, v]) => v.active > 0);
  if (loadEntries.length > 0) {
    lines.push("Active projects by client:");
    for (const [client, load] of loadEntries.sort((a, b) => b[1].active - a[1].active)) {
      lines.push(`  - ${client}: ${load.active} active`);
    }
    lines.push("");
  }

  lines.push(`Total active projects: ${data.totalActive}`);

  // Summary verdict
  if (data.overdue.length === 0 && data.dueToday.length === 0) {
    lines.push("Status: All clear — no overdue or urgent deadlines.");
  } else if (data.overdue.length > 3) {
    lines.push("Status: Attention needed — multiple overdue projects.");
  } else {
    lines.push("Status: Under control — check deadlines above.");
  }

  return lines.join("\n");
}

// ─── Check if digest was already sent today ────────────────────────────────

async function wasDigestSentToday(): Promise<boolean> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const existing = await db
    .select({ id: inboxItems.id })
    .from(inboxItems)
    .where(
      and(
        eq(inboxItems.type, "daily_digest"),
        gte(inboxItems.createdAt, todayStart)
      )
    )
    .limit(1);

  return existing.length > 0;
}

// ─── GET /api/admin/cron/daily-digest ───────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Dedup: only 1 digest per day
    const alreadySent = await wasDigestSentToday();
    if (alreadySent) {
      return NextResponse.json({ status: "skipped", reason: "Digest already sent today" });
    }

    // Check ClickUp health first
    const health = await checkHealth();
    if (health.status !== "connected") {
      return NextResponse.json({
        status: "degraded",
        reason: "ClickUp API unreachable — digest skipped",
      });
    }

    // Collect all tasks across all client spaces
    const spaces = await getSpaces();
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const digestData: DigestData = {
      overdue: [],
      dueToday: [],
      inactive: [],
      teamLoad: {},
      totalActive: 0,
    };

    for (const space of spaces) {
      const spaceName = space.name;
      let lists: Awaited<ReturnType<typeof getListsForSpace>>;
      try {
        lists = await getListsForSpace(space.id);
      } catch {
        continue; // Skip spaces we can't access
      }

      let spaceActive = 0;

      for (const list of lists) {
        let tasks: ClickUpTask[];
        try {
          const result = await getTasksForList(list.id, { page: 0, includeSubtasks: false });
          tasks = result.tasks;
        } catch {
          continue; // Skip lists we can't access
        }

        for (const task of tasks) {
          if (!isTaskActive(task)) continue;

          spaceActive++;
          digestData.totalActive++;

          const dueDate = task.due_date ? parseInt(task.due_date, 10) : null;
          const lastUpdate = parseInt(task.date_updated, 10);
          const daysSinceUpdate = Math.round((now - lastUpdate) / (1000 * 60 * 60 * 24));

          // Overdue: due date is in the past
          if (dueDate && dueDate < now) {
            const daysBehind = Math.round((now - dueDate) / (1000 * 60 * 60 * 24));
            digestData.overdue.push({
              name: task.name,
              spaceName,
              daysBehind,
              url: task.url,
            });
          }

          // Due today
          if (dueDate && dueDate >= todayStart.getTime() && dueDate <= todayEnd.getTime()) {
            digestData.dueToday.push({
              name: task.name,
              spaceName,
              url: task.url,
            });
          }

          // Inactive 3+ days (not in client review — those are expected to be slow)
          if (
            daysSinceUpdate >= 3 &&
            task.status.status.toLowerCase() !== "client review"
          ) {
            digestData.inactive.push({
              name: task.name,
              spaceName,
              daysSinceUpdate,
              url: task.url,
            });
          }
        }
      }

      if (spaceActive > 0) {
        digestData.teamLoad[spaceName] = { active: spaceActive, total: spaceActive };
      }
    }

    // Sort overdue by severity (most overdue first)
    digestData.overdue.sort((a, b) => b.daysBehind - a.daysBehind);
    digestData.inactive.sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate);

    // Build summary text
    const summary = buildDigestSummary(digestData);

    // Determine priority based on content
    const priority = digestData.overdue.length > 3 ? "high" : digestData.overdue.length > 0 ? "medium" : "low";

    // Create inbox item
    await db.insert(inboxItems).values({
      type: "daily_digest",
      status: "pending",
      title: `Daily Digest — ${digestData.overdue.length} overdue, ${digestData.dueToday.length} due today, ${digestData.totalActive} active`,
      summary: JSON.stringify({
        text: summary,
        overdue: digestData.overdue.length,
        dueToday: digestData.dueToday.length,
        inactive: digestData.inactive.length,
        totalActive: digestData.totalActive,
        data: digestData,
      }),
      sourceType: "cron",
      protocol: null,
      priority,
    });

    return NextResponse.json({
      status: "ok",
      overdue: digestData.overdue.length,
      dueToday: digestData.dueToday.length,
      inactive: digestData.inactive.length,
      totalActive: digestData.totalActive,
    });
  } catch (error) {
    console.error("[Daily Digest] Error:", error);
    return NextResponse.json(
      { error: "Daily digest failed", detail: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
