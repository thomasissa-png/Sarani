import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { getTask } from "@/lib/integrations/clickup";

/**
 * GET /api/admin/integrations/clickup/task-list?taskId=abc123
 *
 * Fetch a ClickUp task and return its list ID and list name.
 * Used by ShareFolderModal to resolve the SP subfolder via config
 * when the tracker didn't propagate clickupListId.
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
    return NextResponse.json({
      listId: task.list?.id ?? null,
      listName: task.list?.name ?? null,
    });
  } catch (error) {
    console.error("[ClickUp Task List] Error fetching task:", error);
    return NextResponse.json(
      { error: "Failed to fetch ClickUp task" },
      { status: 500 }
    );
  }
}
