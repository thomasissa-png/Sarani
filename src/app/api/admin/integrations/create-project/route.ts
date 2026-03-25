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
  resolveSheetName,
  type DriveItem,
} from "@/lib/integrations/sharepoint";
import { logSync, acquireAdvisoryLock } from "@/lib/integrations/cache";
import {
  CLIENT_MAPPINGS,
  SHAREPOINT_TRACKERS_DRIVE_ID,
  SHAREPOINT_ASSETS_DRIVE_ID,
  ASSETS_CUSTOMERS_BASE_PATH,
  EXCEL_SHEET_NAME_CANDIDATES,
  getTrackerFullPath,
  getMappingBySpaceName,
} from "@/lib/integrations/config";
import { setCustomFieldValue } from "@/lib/integrations/clickup";

// ─── Validation ────────────────────────────────────────────────────────────

const createProjectSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  projectName: z.string().min(1, "Project name is required"),
  contactName: z.string().optional().default(""),
  category: z.string().optional().default(""),
  division: z.string().optional().default(""),
  estimatedValue: z.number().optional(),
  // E-09: Previous successful results to skip on retry
  previousResults: z.object({
    clickup: z.object({ taskId: z.string(), url: z.string() }).optional(),
    sharepoint: z.object({ folderUrl: z.string() }).optional(),
    excel: z.object({ row: z.number() }).optional(),
  }).optional(),
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

  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    // E-09: Skip if already completed in a previous attempt
    if (data.previousResults?.clickup) {
      const prev = data.previousResults.clickup;
      result.clickup = { success: true, taskId: prev.taskId, url: prev.url };
      // We don't have the full task object, but we have the ID for step 4
      clickupTask = { id: prev.taskId, url: prev.url, custom_fields: [] } as unknown as ClickUpTask;
    } else try {
      // Get the matching list in the space (by division name, or first list if no division)
      const lists = await getListsForSpace(effectiveMapping.clickupSpaceId);
      if (lists.length === 0) {
        throw new Error(`No lists found in ClickUp space ${effectiveMapping.clickupSpaceName}`);
      }
      const targetList = data.division
        ? lists.find((l) => l.name.toLowerCase() === data.division.toLowerCase()) ?? lists[0]
        : lists[0];

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

    // E-09: Skip if already completed in a previous attempt
    if (data.previousResults?.sharepoint) {
      folderUrl = data.previousResults.sharepoint.folderUrl;
      result.sharepoint = { success: true, folderUrl };
    } else try {
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

      // Folder naming convention: YYYYMMDD_Project Name (truncated if too long)
      const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const maxNameLength = 80; // SharePoint path limit safety
      const truncatedName = data.projectName.length > maxNameLength
        ? data.projectName.slice(0, maxNameLength).trim()
        : data.projectName;
      const folderName = `${datePrefix}_${truncatedName}`;

      let folder: DriveItem;
      try {
        folder = await createFolder(
          SHAREPOINT_ASSETS_DRIVE_ID,
          parentPath,
          folderName
        );
      } catch (folderErr) {
        // E-04: If folder already exists (409 conflict), treat as success
        // and fetch the existing folder's URL
        if (
          folderErr instanceof Error &&
          "statusCode" in folderErr &&
          (folderErr as { statusCode: number }).statusCode === 409
        ) {
          folder = await getDriveItemByPath(
            SHAREPOINT_ASSETS_DRIVE_ID,
            `${parentPath}/${folderName}`
          );
        } else {
          throw folderErr;
        }
      }
      folderUrl = folder.webUrl;

      result.sharepoint = {
        success: true,
        folderUrl,
      };

      await logSync({
        source: "sharepoint",
        action: "create_project_folder",
        entityId: folder.id,
        payload: { path: `${parentPath}/${folderName}` },
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

    // E-09: Skip if already completed in a previous attempt
    if (data.previousResults?.excel) {
      result.excel = { success: true, row: data.previousResults.excel.row };
    } else try {
      const trackerPath = getTrackerFullPath(effectiveMapping.excelTrackerFilename);

      // E-03: Acquire advisory lock on this tracker file to prevent race conditions
      const releaseLock = await acquireAdvisoryLock(
        `excel_write:${effectiveMapping.excelTrackerFilename}`,
        30
      );
      if (!releaseLock) {
        throw new Error("Could not acquire lock for Excel write — another write may be in progress. Please retry.");
      }

      try {
      const driveItem = await getDriveItemByPath(SHAREPOINT_TRACKERS_DRIVE_ID, trackerPath);

      // B-02/E-05: Resolve the actual sheet name instead of hardcoding "Sheet1"
      const sheetName = await resolveSheetName(
        SHAREPOINT_TRACKERS_DRIVE_ID,
        driveItem.id,
        EXCEL_SHEET_NAME_CANDIDATES
      );

      // Read the used range to find the next empty row
      const usedRange = await readExcelUsedRange(
        SHAREPOINT_TRACKERS_DRIVE_ID,
        driveItem.id,
        sheetName
      );

      // B-03: Parse usedRange.address to determine the actual start row
      // Address format is like "Sheet1!A1:H25" or "'Feuil1'!A2:H30"
      const addressMatch = usedRange.address.match(/!([A-Z]+)(\d+):/);
      const startRow = addressMatch ? parseInt(addressMatch[2], 10) : 1;
      const nextRow = startRow + usedRange.values.length;
      const today = new Date().toISOString().slice(0, 10);

      // E-06: Read header row to find column positions dynamically
      const headers = usedRange.values[0]?.map((h) =>
        h !== null && h !== undefined ? String(h).toLowerCase().trim() : ""
      ) ?? [];

      // Column mapping (same aliases as tracker route's COL_MAP)
      const findCol = (aliases: string[]): number =>
        headers.findIndex((h) => aliases.includes(h));

      const colCustomer = findCol(["customer", "client"]);
      const colProject = findCol(["project", "project name", "project description"]);
      const colDate = findCol(["date"]);
      const colContact = findCol(["contact", "contact name"]);
      const colStatus = findCol(["status"]);
      const colCategory = findCol(["category", "cat", "cat."]);
      const colTotalValue = findCol(["total value", "total value (eur)", "total", "total eur"]);
      const colLink = findCol(["link", "sharepoint link", "folder link", "sharepoint"]);

      // Build row data using detected column positions
      const numCols = headers.length || 8;
      const rowData: (string | number | null)[] = new Array(numCols).fill("");

      if (colCustomer !== -1) rowData[colCustomer] = data.clientName;
      if (colProject !== -1) rowData[colProject] = data.projectName;
      if (colDate !== -1) rowData[colDate] = today;
      if (colContact !== -1) rowData[colContact] = data.contactName || "";
      if (colStatus !== -1) rowData[colStatus] = "Open";
      if (colCategory !== -1) rowData[colCategory] = data.category || "";
      if (colTotalValue !== -1) rowData[colTotalValue] = data.estimatedValue ?? null;
      if (colLink !== -1) rowData[colLink] = folderUrl ?? "";

      // Build the range address from A to the last column letter
      const lastColLetter = String.fromCharCode(64 + numCols); // 8 -> H
      const rangeAddress = `A${nextRow}:${lastColLetter}${nextRow}`;
      await writeExcelRows(
        SHAREPOINT_TRACKERS_DRIVE_ID,
        driveItem.id,
        sheetName,
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
      } finally {
        // E-03: Release advisory lock
        await releaseLock();
      }
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
          // Q-06: Use the clickupFetch wrapper for retry logic
          await setCustomFieldValue(clickupTask.id, folderField.id, folderUrl);
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
