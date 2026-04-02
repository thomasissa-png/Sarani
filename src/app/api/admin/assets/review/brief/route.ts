// SSR — Load brief OR latest feedback from a ClickUp task for asset review
import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { getTask, getTaskComments, type ClickUpTask } from "@/lib/integrations/clickup";

/**
 * Find the SharePoint project folder URL from ANY custom field in a ClickUp task.
 * No field name guessing — just scan all fields for a sharepoint.com URL value.
 */
function findSharePointUrl(task: ClickUpTask): string | null {
  for (const field of task.custom_fields) {
    if (field.value && typeof field.value === "string") {
      const val = field.value.trim();
      if (val.includes("sharepoint.com") || val.includes("1drv.ms")) {
        return val;
      }
    }
  }
  return null;
}

/**
 * GET /api/admin/assets/review/brief?taskId=xxx
 * GET /api/admin/assets/review/brief?taskId=xxx&mode=feedback
 *
 * mode=feedback: returns the latest ClickUp comment as the review context
 *                (instead of the original brief/description)
 */
export async function GET(request: NextRequest) {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkRateLimit("asset-review-brief", 20, 60_000)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again in 1 minute." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const taskId = request.nextUrl.searchParams.get("taskId");
  const mode = request.nextUrl.searchParams.get("mode"); // "feedback" or null

  if (!taskId || taskId.trim().length === 0) {
    return NextResponse.json(
      { error: "taskId query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const task = await getTask(taskId.trim());
    const folderUrl = findSharePointUrl(task);

    // ─── Feedback mode: return latest ClickUp comments ──────────────
    if (mode === "feedback") {
      const comments = await getTaskComments(taskId.trim());

      // Build feedback context from the most recent comments (max 5)
      const recentComments = comments.slice(0, 5);
      const feedbackParts: string[] = [];

      if (recentComments.length > 0) {
        feedbackParts.push(`Latest feedback on: ${task.name}`);
        feedbackParts.push("");
        for (const comment of recentComments) {
          const date = new Date(parseInt(comment.date));
          const dateStr = date.toLocaleDateString("en-GB", {
            day: "numeric", month: "short", year: "numeric",
          });
          const author = comment.user?.username ?? "Unknown";
          feedbackParts.push(`[${dateStr} — ${author}]`);
          feedbackParts.push(comment.comment_text);
          feedbackParts.push("");
        }
      } else {
        feedbackParts.push(`No comments found on task: ${task.name}`);
      }

      return NextResponse.json({
        brief: feedbackParts.join("\n").trim(),
        taskName: task.name,
        taskUrl: task.url,
        folderUrl,
        mode: "feedback",
        commentCount: comments.length,
      });
    }

    // ─── Default mode: return original brief ────────────────────────
    const parts: string[] = [];

    if (task.name) {
      parts.push(`Project: ${task.name}`);
    }

    if (task.description) {
      parts.push("");
      parts.push(task.description);
    }

    if (task.subtasks && task.subtasks.length > 0) {
      parts.push("");
      parts.push("Deliverables:");
      for (const subtask of task.subtasks) {
        parts.push(`- ${subtask.name}`);
      }
    }

    const brief = parts.join("\n").trim();

    return NextResponse.json({
      brief: brief || null,
      taskName: task.name,
      taskUrl: task.url,
      folderUrl,
      mode: "brief",
    });
  } catch (error) {
    console.error("[Asset Review Brief] Error loading ClickUp task:", error);

    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("401") || message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "ClickUp authentication failed. Check API key." },
        { status: 502 }
      );
    }
    if (message.includes("404") || message.includes("not found")) {
      return NextResponse.json(
        { error: `ClickUp task "${taskId}" not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to load brief from ClickUp", details: message },
      { status: 500 }
    );
  }
}
