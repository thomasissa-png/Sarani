import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { inboxItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  getListsForSpace,
  createTask,
  addTaskComment,
  getTask,
  setCustomFieldValue,
  type ClickUpTask,
} from "@/lib/integrations/clickup";
import {
  createFolder,
  getDriveItemByPath,
  readExcelUsedRange,
  writeExcelRows,
  resolveSheetName,
  SharePointApiError,
} from "@/lib/integrations/sharepoint";
import { logSync, acquireAdvisoryLock } from "@/lib/integrations/cache";
import {
  SHAREPOINT_ASSETS_DRIVE_ID,
  SHAREPOINT_TRACKERS_DRIVE_ID,
  ASSETS_CUSTOMERS_BASE_PATH,
  EXCEL_SHEET_NAME_CANDIDATES,
  getMappingBySpaceId,
  getTrackerFullPath,
  CLICKUP_PM_MAPPING,
} from "@/lib/integrations/config";
import { COL_MAP, findColumnIndex } from "@/lib/integrations/excel-parser";

// ─── Validation ─────────────────────────────────────────────────────────────

const ExecuteAutoBriefSchema = z.object({
  inboxItemId: z.string().uuid(),
  projectName: z.string().min(1, "Project name is required").max(200),
  clientName: z.string().min(1, "Client name is required"),
  entity: z.string().optional(),
  brief: z.string().max(20_000),
  contactEmail: z.string().email("Invalid contact email"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  clickupSpaceId: z.string().min(1, "ClickUp space is required"),
  addToTracker: z.boolean().optional().default(true),
  createSharepointFolder: z.boolean().optional().default(true),
  // Optional: stored taskId from a previous partial execution (retry-safe)
  previousTaskId: z.string().optional(),
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function columnNumberToLetter(n: number): string {
  let result = "";
  let num = n;
  while (num > 0) {
    const remainder = (num - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    num = Math.floor((num - 1) / 26);
  }
  return result;
}

// ─── POST /api/auto-brief/execute ───────────────────────────────────────────
// Step 3 of the auto-brief pipeline: create ClickUp task, SharePoint folder,
// post comments, add tracker row, update inbox item.

export async function POST(request: NextRequest) {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: z.infer<typeof ExecuteAutoBriefSchema>;
  try {
    const rawBody = await request.json();
    body = ExecuteAutoBriefSchema.parse(rawBody);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Resolve client mapping from spaceId
  const mapping = getMappingBySpaceId(body.clickupSpaceId);
  if (!mapping) {
    return NextResponse.json(
      { error: "No integration mapping found for this ClickUp space" },
      { status: 400 }
    );
  }

  const warnings: string[] = [];

  // ─── Step 1: Create ClickUp task ──────────────────────────────────────────
  // Abort entire sequence if this fails.

  let clickupTask: ClickUpTask;

  if (body.previousTaskId) {
    // Retry-safe: skip creation if task was already created
    clickupTask = { id: body.previousTaskId, url: "" } as unknown as ClickUpTask;
  } else {
    try {
      const lists = await getListsForSpace(body.clickupSpaceId);
      if (lists.length === 0) {
        return NextResponse.json(
          { error: `No lists found in ClickUp space ${mapping.clickupSpaceName}` },
          { status: 400 }
        );
      }

      clickupTask = await createTask(lists[0].id, {
        name: body.projectName,
        status: "Open",
        due_date: new Date(body.startDate).getTime(),
      });

      await logSync({
        source: "clickup",
        action: "auto_brief_create_task",
        entityId: clickupTask.id,
        payload: { projectName: body.projectName, spaceId: body.clickupSpaceId },
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      console.error("[Auto-Brief Execute] ClickUp task creation failed:", errMsg);
      return NextResponse.json(
        {
          error: "ClickUp unavailable — project not created",
          detail: errMsg,
          step: "clickup_task",
        },
        { status: 502 }
      );
    }
  }

  // ─── Step 1b: Set PM custom field on ClickUp task ──────────────────────────
  // Non-blocking: warning on failure.

  try {
    const pmEmail = session.email;
    const clickupUserId = pmEmail ? CLICKUP_PM_MAPPING[pmEmail] : undefined;
    if (clickupUserId) {
      const taskDetails = await getTask(clickupTask.id);
      const pmField = taskDetails.custom_fields.find(
        (f) => f.name.toLowerCase() === "pm" || f.name.toLowerCase() === "project manager"
      );
      if (pmField) {
        await setCustomFieldValue(clickupTask.id, pmField.id, { add: [clickupUserId] });
      } else {
        console.warn("[Auto-Brief Execute] PM custom field not found on task");
      }
    } else if (pmEmail) {
      console.warn(`[Auto-Brief Execute] No ClickUp user ID mapped for ${pmEmail}`);
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Auto-Brief Execute] PM field setter failed:", errMsg);
    warnings.push(`Could not set PM field: ${errMsg}`);
  }

  // ─── Step 2: Create SharePoint folder ─────────────────────────────────────
  // Non-blocking: warnings on failure, not abort.

  let folderUrl: string | null = null;

  if (body.createSharepointFolder) try {
    const parentPath = `${ASSETS_CUSTOMERS_BASE_PATH}/${mapping.sharepointCustomerFolder}`;
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const maxNameLength = 80;
    const truncatedName = body.projectName.length > maxNameLength
      ? body.projectName.slice(0, maxNameLength).trim()
      : body.projectName;
    const folderName = `${datePrefix}_${truncatedName}`;

    let folder;
    try {
      folder = await createFolder(SHAREPOINT_ASSETS_DRIVE_ID, parentPath, folderName);
    } catch (folderErr) {
      // Handle 409 conflict (folder exists) — append suffix
      if (
        folderErr instanceof SharePointApiError &&
        folderErr.statusCode === 409
      ) {
        let suffix = 2;
        let retryFolder = null;
        while (suffix <= 5 && !retryFolder) {
          try {
            retryFolder = await createFolder(
              SHAREPOINT_ASSETS_DRIVE_ID,
              parentPath,
              `${folderName} (${suffix})`
            );
          } catch (retryErr) {
            if (
              retryErr instanceof SharePointApiError &&
              retryErr.statusCode === 409
            ) {
              suffix++;
            } else {
              throw retryErr;
            }
          }
        }
        if (!retryFolder) {
          throw new Error("Could not create folder after 4 duplicate attempts");
        }
        folder = retryFolder;
        warnings.push(`Folder name was already taken; created as "${folderName} (${suffix - 1})"`);
      } else {
        throw folderErr;
      }
    }

    folderUrl = folder.webUrl;

    await logSync({
      source: "sharepoint",
      action: "auto_brief_create_folder",
      entityId: folder.id,
      payload: { folderUrl },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Auto-Brief Execute] SharePoint folder creation failed:", errMsg);
    warnings.push(`SharePoint folder failed: ${errMsg}. ClickUp task was created (ID: ${clickupTask.id}).`);
  }

  // ─── Step 3: Add SharePoint link as ClickUp comment ───────────────────────

  if (folderUrl) {
    try {
      await addTaskComment(clickupTask.id, `📁 SharePoint folder: ${folderUrl}`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      console.error("[Auto-Brief Execute] SharePoint comment failed:", errMsg);
      warnings.push(`Failed to post SharePoint link to ClickUp: ${errMsg}`);
    }
  }

  // ─── Step 4: Post brief as ClickUp comment ───────────────────────────────

  if (body.brief) {
    try {
      await addTaskComment(clickupTask.id, body.brief);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      console.error("[Auto-Brief Execute] Brief comment failed:", errMsg);
      warnings.push(`Failed to post brief to ClickUp: ${errMsg}`);
    }
  }

  // ─── Step 5: Add tracker row ──────────────────────────────────────────────
  // Non-blocking: warning on failure. Skipped if PM opted out.

  if (body.addToTracker) try {
    const trackerPath = getTrackerFullPath(mapping.excelTrackerFilename);

    const releaseLock = await acquireAdvisoryLock(
      `excel_write:${mapping.excelTrackerFilename}`,
      30
    );
    if (!releaseLock) {
      throw new Error("Could not acquire lock for Excel write — another write may be in progress");
    }

    try {
      const driveItem = await getDriveItemByPath(SHAREPOINT_TRACKERS_DRIVE_ID, trackerPath);
      const sheetName = await resolveSheetName(
        SHAREPOINT_TRACKERS_DRIVE_ID,
        driveItem.id,
        EXCEL_SHEET_NAME_CANDIDATES
      );

      const usedRange = await readExcelUsedRange(
        SHAREPOINT_TRACKERS_DRIVE_ID,
        driveItem.id,
        sheetName
      );

      const addressMatch = usedRange.address.match(/!([A-Z]+)(\d+):/);
      const startRow = addressMatch ? parseInt(addressMatch[2], 10) : 1;
      const nextRow = startRow + usedRange.values.length;

      const headers = usedRange.values[0]?.map((h) =>
        h !== null && h !== undefined ? String(h).toLowerCase().trim() : ""
      ) ?? [];

      const colCustomer = findColumnIndex(headers, COL_MAP.customer);
      const colProject = findColumnIndex(headers, COL_MAP.project);
      const colDate = findColumnIndex(headers, COL_MAP.date);
      const colContact = findColumnIndex(headers, COL_MAP.contact);
      const colStatus = findColumnIndex(headers, COL_MAP.status);
      const colLink = findColumnIndex(headers, COL_MAP.link);

      const numCols = headers.length || 8;
      const rowData: (string | number | null)[] = new Array(numCols).fill("");

      if (colCustomer !== -1) rowData[colCustomer] = body.clientName;
      if (colProject !== -1) rowData[colProject] = body.projectName;
      if (colDate !== -1) rowData[colDate] = body.startDate;
      if (colContact !== -1) rowData[colContact] = body.contactEmail;
      if (colStatus !== -1) rowData[colStatus] = "Open";
      if (colLink !== -1) rowData[colLink] = folderUrl ?? "";

      const lastColLetter = columnNumberToLetter(numCols);
      const rangeAddress = `A${nextRow}:${lastColLetter}${nextRow}`;

      await writeExcelRows(
        SHAREPOINT_TRACKERS_DRIVE_ID,
        driveItem.id,
        sheetName,
        rangeAddress,
        [rowData]
      );

      await logSync({
        source: "sharepoint",
        action: "auto_brief_write_tracker",
        entityId: driveItem.id,
        payload: { row: nextRow, filename: mapping.excelTrackerFilename },
      });
    } finally {
      await releaseLock();
    }
  } catch (err) {
    const is423 = err instanceof SharePointApiError && err.statusCode === 423;
    const errMsg = is423
      ? "The Excel tracker is currently being edited by another user"
      : err instanceof Error
        ? err.message
        : "Unknown error";
    console.error("[Auto-Brief Execute] Tracker row failed:", errMsg);
    warnings.push(`Tracker row not added: ${errMsg}. Add manually.`);
  }

  // ─── Step 6: Update inbox item status to "done" ──────────────────────────

  try {
    await db
      .update(inboxItems)
      .set({
        status: "done",
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(inboxItems.id, body.inboxItemId));
  } catch (err) {
    console.error("[Auto-Brief Execute] Failed to update inbox item:", err);
    warnings.push("Inbox item was not updated to done — update manually");
  }

  // ─── Step 7: Trigger auto-quote pipeline (non-blocking) ────────────────
  // If this fails, the project is still created — the PM can build the quote manually.

  let autoQuoteTriggered = false;
  try {
    const autoQuoteUrl = new URL("/api/admin/inbox/auto-quote", request.url);
    const autoQuoteRes = await fetch(autoQuoteUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: request.headers.get("Cookie") ?? "",
      },
      body: JSON.stringify({
        clientName: body.clientName,
        projectName: body.projectName,
        briefText: body.brief,
        contactEmail: body.contactEmail,
        clickupTaskId: clickupTask.id,
        clickupSpaceId: body.clickupSpaceId,
      }),
      signal: AbortSignal.timeout(35_000), // 30s LLM + 5s overhead
    });
    autoQuoteTriggered = autoQuoteRes.ok;
    if (!autoQuoteRes.ok) {
      const errData = await autoQuoteRes.json().catch(() => ({}));
      const errDetail = (errData as Record<string, unknown>).error ?? autoQuoteRes.statusText;
      console.error("[Auto-Brief Execute] Auto-quote trigger failed:", errDetail);
      warnings.push(`Auto-quote not generated: ${errDetail}. Build quote manually.`);
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Auto-Brief Execute] Auto-quote trigger error:", errMsg);
    warnings.push(`Auto-quote not generated: ${errMsg}. Build quote manually.`);
  }

  return NextResponse.json({
    success: true,
    taskId: clickupTask.id,
    taskUrl: clickupTask.url || null,
    folderUrl,
    autoQuoteTriggered,
    warnings: warnings.length > 0 ? warnings : undefined,
  });
}
