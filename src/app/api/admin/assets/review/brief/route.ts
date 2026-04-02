// SSR — Load brief/description from a ClickUp task for asset review
import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { getTask, type ClickUpTask } from "@/lib/integrations/clickup";

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

export async function GET(request: NextRequest) {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 20 req/min
  if (!checkRateLimit("asset-review-brief", 20, 60_000)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again in 1 minute." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const taskId = request.nextUrl.searchParams.get("taskId");
  if (!taskId || taskId.trim().length === 0) {
    return NextResponse.json(
      { error: "taskId query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const task = await getTask(taskId.trim());

    // Build brief from task description + subtask names
    const parts: string[] = [];

    if (task.name) {
      parts.push(`Project: ${task.name}`);
    }

    if (task.description) {
      // ClickUp descriptions can contain markdown — pass through as-is
      // The frontend brief parser handles plain-text line extraction
      parts.push("");
      parts.push(task.description);
    }

    // Include subtask names as potential deliverable list
    if (task.subtasks && task.subtasks.length > 0) {
      parts.push("");
      parts.push("Deliverables:");
      for (const subtask of task.subtasks) {
        parts.push(`- ${subtask.name}`);
      }
    }

    const brief = parts.join("\n").trim();

    // Extract SharePoint folder URL from ClickUp custom fields.
    // Instead of guessing field names, scan ALL custom fields for any
    // value that looks like a SharePoint URL. The data is already in ClickUp.
    const folderUrl = findSharePointUrl(task);

    return NextResponse.json({
      brief: brief || null,
      taskName: task.name,
      taskUrl: task.url,
      folderUrl,
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
