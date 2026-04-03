import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { getTask, extractSharePointUrlFromTask } from "@/lib/integrations/clickup";

/**
 * GET /api/admin/integrations/clickup/sharepoint-link?taskId=abc123
 *
 * Simple endpoint: fetch a ClickUp task, extract the SharePoint URL from its
 * custom fields, and return it. Used by the ShareFolderModal when the tracker
 * doesn't have the SharePoint link cached.
 */
export async function GET(request: NextRequest) {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const taskId = request.nextUrl.searchParams.get("taskId");
  if (!taskId) {
    return NextResponse.json({ error: "Missing taskId parameter" }, { status: 400 });
  }

  try {
    const task = await getTask(taskId);
    const url = extractSharePointUrlFromTask(task);

    if (!url) {
      // Log all custom fields for debugging
      const fieldSummary = task.custom_fields?.map((f) => ({
        name: f.name,
        type: f.type,
        value: typeof f.value === "string" ? f.value.substring(0, 100) : typeof f.value,
      }));
      console.log("[ClickUp SP] No SharePoint URL found in task", taskId, "fields:", JSON.stringify(fieldSummary));
      return NextResponse.json({ url: null, fields: fieldSummary });
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error("[ClickUp SP] Error fetching task:", error);
    return NextResponse.json(
      { error: "Failed to fetch ClickUp task" },
      { status: 500 }
    );
  }
}
