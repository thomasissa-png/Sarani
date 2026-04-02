// SSR — Load brief/description from a ClickUp task for asset review
import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { getTask, getCustomFieldValue } from "@/lib/integrations/clickup";
import { getMappingBySpaceId, ASSETS_CUSTOMERS_BASE_PATH, SHAREPOINT_ASSETS_DRIVE_ID } from "@/lib/integrations/config";
import { getDriveItemByPath, listDriveItems } from "@/lib/integrations/sharepoint";

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

    // Extract SharePoint folder URL from custom fields
    // Common field names: "Folder URL", "Folder", "SharePoint", "SP Link"
    let folderUrl =
      getCustomFieldValue(task, "Folder URL") ||
      getCustomFieldValue(task, "Folder") ||
      getCustomFieldValue(task, "SharePoint") ||
      getCustomFieldValue(task, "SP Link") ||
      getCustomFieldValue(task, "folder url") ||
      null;

    // Fallback: find the project folder inside the client's SP directory
    if (!folderUrl && task.space?.id && task.name) {
      const mapping = getMappingBySpaceId(task.space.id);
      if (mapping?.sharepointCustomerFolder) {
        const clientPath = `${ASSETS_CUSTOMERS_BASE_PATH}/${mapping.sharepointCustomerFolder}`;
        try {
          // List folders in the client directory and find one matching the project name
          const items = await listDriveItems(SHAREPOINT_ASSETS_DRIVE_ID, clientPath);
          const projectName = task.name.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
          const projectFolder = items
            .filter((item) => item.folder)
            .find((item) => {
              const folderName = item.name.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
              return folderName.includes(projectName) || projectName.includes(folderName);
            });
          if (projectFolder) {
            folderUrl = projectFolder.webUrl ?? `${clientPath}/${projectFolder.name}`;
          }
          // If no project folder found, don't fallback to client folder — leave null
          // so the PM knows to enter the path manually
        } catch {
          // SP error — leave folderUrl null
        }
      }
    }

    return NextResponse.json({
      brief: brief || null,
      taskName: task.name,
      taskUrl: task.url,
      folderUrl,
      clientName: task.space?.id ? getMappingBySpaceId(task.space.id)?.clickupSpaceName ?? null : null,
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
