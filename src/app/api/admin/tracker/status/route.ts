// SSR — Update ClickUp task status and optionally post a comment.
// Used by Asset Review to approve (move to "client review") or return to designer ("in progress").
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromSession } from "@/lib/auth";
import {
  getSpaces,
  getListsForSpace,
  getTasksForList,
  updateTaskStatus,
  addTaskComment,
  type ClickUpTask,
} from "@/lib/integrations/clickup";
import {
  CLIENT_MAPPINGS,
  getMappingBySpaceName,
} from "@/lib/integrations/config";

// ─── Validation ────────────────────────────────────────────────────────────

const PatchBodySchema = z.object({
  projectId: z.string().min(1, "projectId is required"),
  newStatus: z.string().min(1, "newStatus is required"),
  comment: z.string().optional(),
});

// ─── Rate limiting (simple in-memory per IP) ───────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (rateLimitMap.size > 100) {
    for (const [key, val] of rateLimitMap) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
  }

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

// ─── PATCH /api/admin/tracker/status ──────────────────────────────────────

export async function PATCH(request: NextRequest) {
  // Auth check
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limiting
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  // Validate body
  let body: z.infer<typeof PatchBodySchema>;
  try {
    const raw = await request.json();
    const parsed = PatchBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 },
      );
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    // Resolve projectId to a ClickUp task.
    // projectId is the SharePoint project path (e.g. "02. Sony/Banners Q2").
    // Strategy: extract client folder name -> find ClickUp space -> search tasks by name.
    const task = await resolveTask(body.projectId);
    if (!task) {
      return NextResponse.json(
        { error: "Could not find a matching ClickUp task for this project" },
        { status: 404 },
      );
    }

    // Update the task status
    await updateTaskStatus(task.id, body.newStatus);

    // Post comment if provided
    if (body.comment) {
      await addTaskComment(task.id, body.comment);
    }

    return NextResponse.json({
      success: true,
      taskId: task.id,
      taskName: task.name,
      newStatus: body.newStatus,
    });
  } catch (error) {
    console.error("[Tracker Status API] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── Task Resolver ─────────────────────────────────────────────────────────

/**
 * Resolve a SharePoint project path to a ClickUp task.
 * Path format: "02. Sony/Banners Q2" -> find in Sony space -> match task name "Banners Q2".
 */
async function resolveTask(projectId: string): Promise<ClickUpTask | null> {
  const parts = projectId.split("/");
  if (parts.length < 2) return null;

  const clientFolder = parts[0]; // e.g. "02. Sony"
  const projectName = parts.slice(1).join("/"); // e.g. "Banners Q2"

  // Find the client mapping from the folder name
  const mapping = CLIENT_MAPPINGS.find(
    (m) => m.sharepointCustomerFolder.toLowerCase() === clientFolder.toLowerCase()
  );
  if (!mapping) return null;

  // Get lists in this ClickUp space
  const lists = await getListsForSpace(mapping.clickupSpaceId);

  // Search through lists for a task matching the project name
  const projectNameLower = projectName.toLowerCase().trim();

  for (const list of lists) {
    const result = await getTasksForList(list.id, { page: 0 });
    const tasks = result.tasks;

    // Try exact name match first, then fuzzy contains
    const exactMatch = tasks.find(
      (t) => t.name.toLowerCase().trim() === projectNameLower
    );
    if (exactMatch) return exactMatch;

    const containsMatch = tasks.find(
      (t) =>
        t.name.toLowerCase().includes(projectNameLower) ||
        projectNameLower.includes(t.name.toLowerCase().trim())
    );
    if (containsMatch) return containsMatch;
  }

  return null;
}
