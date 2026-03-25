import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromSession } from "@/lib/auth";
import {
  getListsForSpace,
  createTask,
  type ClickUpTask,
} from "@/lib/integrations/clickup";
import {
  getDriveItemByPath,
  readExcelUsedRange,
  writeExcelRows,
  createFolder,
  type DriveItem,
} from "@/lib/integrations/sharepoint";
import { logSync } from "@/lib/integrations/cache";
import {
  CLIENT_MAPPINGS,
  SHAREPOINT_TRACKERS_DRIVE_ID,
  SHAREPOINT_ASSETS_DRIVE_ID,
  ASSETS_CUSTOMERS_BASE_PATH,
  getTrackerFullPath,
  getMappingBySpaceName,
} from "@/lib/integrations/config";

// ─── Validation ────────────────────────────────────────────────────────────

const createProjectSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  projectName: z.string().min(1, "Project name is required"),
  contactName: z.string().optional().default(""),
  category: z.string().optional().default(""),
  division: z.string().optional().default(""),
  estimatedValue: z.number().optional(),
});

// ─── Types ─────────────────────────────────────────────────────────────────

interface StepResult {
  success: boolean;
  error?: string;
}

interface ClickUpResult extends StepResult {
  taskId?: string;
  url?: string;
}

interface ExcelResult extends StepResult {
  row?: number;
}

interface SharePointResult extends StepResult {
  folderUrl?: string;
}

interface CreateProjectResponse {
  clickup: ClickUpResult;
  excel: ExcelResult;
  sharepoint: SharePointResult;
}

// ─── Route ─────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Find client mapping
    const mapping = getMappingBySpaceName(data.clientName);
    // Fall back to "Other customers" if no direct mapping
    const effectiveMapping =
      mapping ?? CLIENT_MAPPINGS.find((m) => m.clickupSpaceName === "Other customers");

    if (!effectiveMapping) {
      return NextResponse.json(
        { error: "No integration mapping found for this client" },
        { status: 400 }
      );
    }

    const result: CreateProjectResponse = {
      clickup: { success: false },
      excel: { success: false },
      sharepoint: { success: false },
    };

    // ─── Step 1: Create ClickUp task ──────────────────────────────────────

    let clickupTask: ClickUpTask | null = null;
    try {
      // Get the first list in the space
      const lists = await getListsForSpace(effectiveMapping.clickupSpaceId);
      if (lists.length === 0) {
        throw new Error(`No lists found in ClickUp space ${effectiveMapping.clickupSpaceName}`);
      }
      const targetList = lists[0];

      clickupTask = await createTask(targetList.id, {
        name: data.projectName,
        description: [
          `Client: ${data.clientName}`,
          data.contactName ? `Contact: ${data.contactName}` : "",
          data.category ? `Category: ${data.category}` : "",
          data.division ? `Division: ${data.division}` : "",
          data.estimatedValue ? `Estimated value: ${data.estimatedValue}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      });

      result.clickup = {
        success: true,
        taskId: clickupTask.id,
        url: clickupTask.url,
      };

      await logSync({
        source: "clickup",
        action: "create_task",
        entityId: clickupTask.id,
        payload: { listId: targetList.id, projectName: data.projectName },
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      result.clickup = { success: false, error: errMsg };
      await logSync({
        source: "clickup",
        action: "create_task",
        status: "error",
        error: errMsg,
      });
    }

    // ─── Step 2: Create SharePoint folder ─────────────────────────────────

    let folderUrl: string | null = null;
    try {
      const customerBasePath = `${ASSETS_CUSTOMERS_BASE_PATH}/${effectiveMapping.sharepointCustomerFolder}`;
      let parentPath = customerBasePath;

      // If division is specified, create/use a division subfolder
      if (data.division) {
        try {
          await createFolder(SHAREPOINT_ASSETS_DRIVE_ID, customerBasePath, data.division);
        } catch {
          // Folder may already exist — that's fine
        }
        parentPath = `${customerBasePath}/${data.division}`;
      }

      const folder: DriveItem = await createFolder(
        SHAREPOINT_ASSETS_DRIVE_ID,
        parentPath,
        data.projectName
      );
      folderUrl = folder.webUrl;

      result.sharepoint = {
        success: true,
        folderUrl,
      };

      await logSync({
        source: "sharepoint",
        action: "create_project_folder",
        entityId: folder.id,
        payload: { path: `${parentPath}/${data.projectName}` },
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      result.sharepoint = { success: false, error: errMsg };
      await logSync({
        source: "sharepoint",
        action: "create_project_folder",
        status: "error",
        error: errMsg,
      });
    }

    // ─── Step 3: Add Excel tracker row ────────────────────────────────────

    try {
      const trackerPath = getTrackerFullPath(effectiveMapping.excelTrackerFilename);
      const driveItem = await getDriveItemByPath(SHAREPOINT_TRACKERS_DRIVE_ID, trackerPath);

      // Read the used range to find the next empty row
      const usedRange = await readExcelUsedRange(
        SHAREPOINT_TRACKERS_DRIVE_ID,
        driveItem.id,
        "Sheet1"
      );

      const nextRow = usedRange.values.length + 1;
      const today = new Date().toISOString().slice(0, 10);

      // Standard tracker columns: Client | Project | Date | Contact | Status | Category | Value | Folder URL
      const rowData: (string | number | null)[] = [
        data.clientName,
        data.projectName,
        today,
        data.contactName || "",
        "Open",
        data.category || "",
        data.estimatedValue ?? null,
        folderUrl ?? "",
      ];

      const rangeAddress = `A${nextRow}:H${nextRow}`;
      await writeExcelRows(
        SHAREPOINT_TRACKERS_DRIVE_ID,
        driveItem.id,
        "Sheet1",
        rangeAddress,
        [rowData]
      );

      result.excel = { success: true, row: nextRow };

      await logSync({
        source: "sharepoint",
        action: "write_tracker_row",
        entityId: driveItem.id,
        payload: { row: nextRow, filename: effectiveMapping.excelTrackerFilename },
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      result.excel = { success: false, error: errMsg };
      await logSync({
        source: "sharepoint",
        action: "write_tracker_row",
        status: "error",
        error: errMsg,
      });
    }

    // ─── Step 4: Update ClickUp task with folder URL ──────────────────────

    if (clickupTask && folderUrl) {
      try {
        // Find the "Folder" custom field on the task
        const folderField = clickupTask.custom_fields.find(
          (f) => f.name.toLowerCase() === "folder" || f.name.toLowerCase() === "folder url"
        );

        if (folderField) {
          // Use the ClickUp API to set the custom field value
          const apiKey = process.env.CLICKUP_API_KEY;
          if (apiKey) {
            await fetch(
              `https://api.clickup.com/api/v2/task/${clickupTask.id}/field/${folderField.id}`,
              {
                method: "POST",
                headers: {
                  Authorization: apiKey,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ value: folderUrl }),
              }
            );
          }
        }

        await logSync({
          source: "clickup",
          action: "update_task_folder_url",
          entityId: clickupTask.id,
          payload: { folderUrl },
        });
      } catch (err) {
        // Non-critical — don't mark overall as failed
        await logSync({
          source: "clickup",
          action: "update_task_folder_url",
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    const overallSuccess =
      result.clickup.success && result.excel.success && result.sharepoint.success;

    return NextResponse.json(result, {
      status: overallSuccess ? 200 : 207, // 207 Multi-Status for partial success
    });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
