import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { caseStudyCandidates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  getSpaces,
  getListsForSpace,
  getAllTasksForList,
  type ClickUpTask,
  type ClickUpCustomField,
} from "@/lib/integrations/clickup";
import { listDriveItems } from "@/lib/integrations/sharepoint";
import {
  CLIENT_MAPPINGS,
  SHAREPOINT_ASSETS_DRIVE_ID,
  ASSETS_CUSTOMERS_BASE_PATH,
  getMappingBySpaceId,
} from "@/lib/integrations/config";
import {
  calculateScore,
  deriveSector,
  getPublishedSectors,
  DEFAULT_SCORING_CONFIG,
} from "@/lib/case-studies/scoring";

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Extract a custom field value by name (case-insensitive) */
function getCustomField(
  fields: ClickUpCustomField[],
  name: string
): string | null {
  const field = fields.find(
    (f) => f.name.toLowerCase() === name.toLowerCase()
  );
  if (!field || field.value === null || field.value === undefined) return null;
  if (typeof field.value === "string") return field.value;
  if (typeof field.value === "number") return String(field.value);
  if (Array.isArray(field.value)) {
    // User field
    if (field.value.length > 0 && typeof field.value[0] === "object" && "username" in field.value[0]) {
      return (field.value as Array<{ username: string }>).map((u) => u.username).join(", ");
    }
    return field.value.join(", ");
  }
  return String(field.value);
}

/** Derive client name from ClickUp Space */
function clientNameFromSpace(spaceName: string): string {
  // Map specific Space names to clean client names
  const mapping = CLIENT_MAPPINGS.find(
    (m) => m.clickupSpaceName.toLowerCase() === spaceName.toLowerCase()
  );
  if (mapping) {
    // Use the folder name (cleaner) but strip leading number
    const folder = mapping.sharepointCustomerFolder;
    return folder.replace(/^\d+\.\s*/, "").trim();
  }
  return spaceName;
}

/** Derive project type from task name and custom fields */
function inferProjectType(task: ClickUpTask): string | null {
  // Try custom field first
  const typeField = getCustomField(task.custom_fields, "project_type")
    ?? getCustomField(task.custom_fields, "type")
    ?? getCustomField(task.custom_fields, "category");
  if (typeField) return typeField;

  // Infer from task name keywords
  const name = task.name.toLowerCase();
  if (name.includes("video") || name.includes("motion") || name.includes("animation")) return "Video Production";
  if (name.includes("rebrand") || name.includes("brand identity")) return "Rebranding";
  if (name.includes("campaign") || name.includes("social media")) return "Campaign";
  if (name.includes("translat") || name.includes("locali")) return "Translation";
  if (name.includes("presentation") || name.includes("deck") || name.includes("slide")) return "Presentation";
  if (name.includes("event")) return "Event";
  if (name.includes("banner") || name.includes("design") || name.includes("layout") || name.includes("visual")) return "Graphic Design";

  return null;
}

/** Extract amount from custom fields */
function extractAmount(task: ClickUpTask): number | null {
  const amountStr = getCustomField(task.custom_fields, "contract_amount")
    ?? getCustomField(task.custom_fields, "amount")
    ?? getCustomField(task.custom_fields, "budget")
    ?? getCustomField(task.custom_fields, "price");
  if (!amountStr) return null;
  const cleaned = amountStr.replace(/[^0-9.,]/g, "").replace(",", ".");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/** Count SharePoint assets for a client/project folder */
async function countSharePointAssets(
  clientFolder: string,
  projectName: string
): Promise<{ count: number; folderUrl: string | null }> {
  try {
    // List items in the client folder and look for a matching subfolder
    const parentPath = `${ASSETS_CUSTOMERS_BASE_PATH}/${clientFolder}`;
    const items = await listDriveItems(SHAREPOINT_ASSETS_DRIVE_ID, parentPath);

    // Try to find a folder matching the project name (fuzzy)
    const projectNameLower = projectName.toLowerCase().trim();
    const matchedFolder = items.find((item) => {
      if (!item.folder) return false;
      const folderLower = item.name.toLowerCase();
      return (
        folderLower.includes(projectNameLower) ||
        projectNameLower.includes(folderLower) ||
        levenshteinSimilarity(folderLower, projectNameLower) >= 0.6
      );
    });

    if (!matchedFolder) {
      return { count: 0, folderUrl: null };
    }

    // Count files in matched folder
    const folderPath = `${parentPath}/${matchedFolder.name}`;
    const children = await listDriveItems(SHAREPOINT_ASSETS_DRIVE_ID, folderPath);
    const fileCount = children.filter((c) => !c.folder).length;

    return {
      count: fileCount,
      folderUrl: matchedFolder.webUrl ?? null,
    };
  } catch {
    // SharePoint unavailable or folder doesn't exist — graceful degradation
    return { count: 0, folderUrl: null };
  }
}

/** Simple Levenshtein-based similarity (0-1) */
function levenshteinSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
    for (let j = 1; j <= b.length; j++) {
      if (i === 0) {
        matrix[i][j] = j;
      } else {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
  }
  return 1 - matrix[a.length][b.length] / maxLen;
}

// ─── Concurrency guard ─────────────────────────────────────────────────────

let scanInProgress = false;

// ─── POST /api/admin/case-studies/scan ─────────────────────────────────────

export async function POST() {
  if (scanInProgress) {
    return NextResponse.json(
      { error: "A scan is already in progress. Please wait for it to complete." },
      { status: 409 }
    );
  }
  scanInProgress = true;
  try {
    // 1. Get published case study sectors for diversity scoring
    const publishedCandidates = await db
      .select({ clientName: caseStudyCandidates.clientName })
      .from(caseStudyCandidates)
      .where(eq(caseStudyCandidates.status, "published"));
    const coveredSectors = getPublishedSectors(
      publishedCandidates.map((c) => c.clientName)
    );

    // 2. Fetch all ClickUp Spaces
    let spaces;
    try {
      spaces = await getSpaces();
    } catch (err) {
      console.error("ClickUp API error during scan:", err);
      return NextResponse.json(
        {
          error: "ClickUp API unreachable. Check your API key and try again.",
          scanned: 0,
          newCandidates: 0,
          autoGenerated: 0,
          errors: [err instanceof Error ? err.message : "ClickUp unavailable"],
          completedAt: new Date().toISOString(),
        },
        { status: 502 }
      );
    }

    let totalScanned = 0;
    let newCandidates = 0;
    let updatedCandidates = 0;
    const errors: string[] = [];

    // 3. Iterate over all Spaces → Lists → Tasks
    for (const space of spaces) {
      const mapping = getMappingBySpaceId(space.id);
      const clientName = clientNameFromSpace(space.name);

      try {
        const lists = await getListsForSpace(space.id);

        for (const list of lists) {
          try {
            const tasks = await getAllTasksForList(list.id);

            for (const task of tasks) {
              // Only process closed/completed tasks
              if (
                task.status.type !== "closed" &&
                task.status.status.toLowerCase() !== "closed" &&
                task.status.status.toLowerCase() !== "done" &&
                task.status.status.toLowerCase() !== "complete"
              ) {
                continue;
              }

              totalScanned++;

              // Extract data from the task
              const projectType = inferProjectType(task);
              const amount = extractAmount(task);
              const completedAt = task.date_closed
                ? new Date(parseInt(task.date_closed))
                : null;

              // Count SharePoint assets (if mapping exists)
              let assetCount = 0;
              let folderUrl: string | null = null;
              if (mapping) {
                const assets = await countSharePointAssets(
                  mapping.sharepointCustomerFolder,
                  task.name
                );
                assetCount = assets.count;
                folderUrl = assets.folderUrl;
              }

              // Calculate score
              const sector = deriveSector(clientName);
              const { total, breakdown } = calculateScore({
                clientName,
                projectAmount: amount,
                assetCount,
                projectType,
                completedAt,
                coveredSectors,
                sector,
              });

              // Determine initial status
              const status =
                total >= DEFAULT_SCORING_CONFIG.autoGenerateThreshold
                  ? "suggested"
                  : "ignored";

              // Upsert: check if task already exists
              const existing = await db
                .select({ id: caseStudyCandidates.id })
                .from(caseStudyCandidates)
                .where(eq(caseStudyCandidates.clickupTaskId, task.id))
                .limit(1);

              if (existing.length === 0) {
                await db.insert(caseStudyCandidates).values({
                  clickupTaskId: task.id,
                  clientName,
                  projectName: task.name,
                  projectType,
                  projectAmount: amount ? String(amount) : null,
                  completedAt,
                  sharePointAssetCount: assetCount,
                  sharePointFolderUrl: folderUrl,
                  scoreTotal: total,
                  scoreBreakdown: breakdown,
                  status,
                  lastScannedAt: new Date(),
                });
                newCandidates++;
              } else {
                // Update score but preserve status if it was manually changed
                await db
                  .update(caseStudyCandidates)
                  .set({
                    scoreTotal: total,
                    scoreBreakdown: breakdown,
                    sharePointAssetCount: assetCount,
                    sharePointFolderUrl: folderUrl,
                    projectType,
                    projectAmount: amount ? String(amount) : null,
                    lastScannedAt: new Date(),
                    updatedAt: new Date(),
                  })
                  .where(eq(caseStudyCandidates.id, existing[0].id));
                updatedCandidates++;
              }
            }
          } catch (err) {
            const msg = `Error scanning list "${list.name}" in space "${space.name}": ${err instanceof Error ? err.message : "unknown"}`;
            console.error(msg);
            errors.push(msg);
          }
        }
      } catch (err) {
        const msg = `Error fetching lists for space "${space.name}": ${err instanceof Error ? err.message : "unknown"}`;
        console.error(msg);
        errors.push(msg);
      }
    }

    return NextResponse.json({
      scanned: totalScanned,
      newCandidates,
      updatedCandidates,
      autoGenerated: 0, // V1: no auto-generation on scan
      errors,
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error running case study scan:", error);
    return NextResponse.json(
      { error: "Scan failed" },
      { status: 500 }
    );
  } finally {
    scanInProgress = false;
  }
}
